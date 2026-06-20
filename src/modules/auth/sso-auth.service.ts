import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { SSOConfigRepository } from '../organizations/repositories/sso-config.repository';
import { OrganizationsRepository } from '../organizations/repositories/organizations.repository';
import { OrganizationMembersRepository } from '../organizations/repositories/organization-members.repository';
import { UsersService } from '../users/users.service';
import { UsageService } from '../billing/usage.service';
import { generateUuid } from '../../common/utils/uuid.util';
import type { Configuration } from '../../config/configuration';

interface PendingSsoState {
  organizationId: string;
  provider: string;
  nonce: string;
  createdAt: number;
}

const pendingStates = new Map<string, PendingSsoState>();

@Injectable()
export class SSOAuthService {
  constructor(
    private readonly ssoConfigRepo: SSOConfigRepository,
    private readonly organizationsRepository: OrganizationsRepository,
    private readonly orgMembersRepository: OrganizationMembersRepository,
    private readonly usersService: UsersService,
    private readonly usageService: UsageService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<Configuration>,
  ) {}

  private pruneStates(): void {
    const cutoff = Date.now() - 10 * 60 * 1000;
    for (const [key, value] of pendingStates.entries()) {
      if (value.createdAt < cutoff) pendingStates.delete(key);
    }
  }

  async resolveOrganizationByEmail(email: string): Promise<string | null> {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return null;
    const configs = await this.ssoConfigRepo.findEnabledByDomain(domain);
    return configs[0]?.organizationId ?? null;
  }

  async startLogin(params: { organizationId?: string; email?: string }): Promise<{ redirectUrl: string }> {
    this.pruneStates();
    let organizationId = params.organizationId;
    if (!organizationId && params.email) {
      organizationId = (await this.resolveOrganizationByEmail(params.email)) ?? undefined;
    }
    if (!organizationId) {
      throw new NotFoundException('No SSO configuration found for this organization or email domain.');
    }

    const flags = await this.usageService.getFeatureFlags(organizationId);
    if (!flags.ssoEnabled) {
      throw new BadRequestException('SSO is not enabled on your plan.');
    }

    const config = await this.ssoConfigRepo.findByOrganization(organizationId);
    if (!config?.isEnabled) {
      throw new NotFoundException('SSO is not configured for this organization.');
    }

    const state = crypto.randomBytes(16).toString('hex');
    pendingStates.set(state, {
      organizationId,
      provider: config.provider,
      nonce: crypto.randomBytes(8).toString('hex'),
      createdAt: Date.now(),
    });

    if (config.provider === 'OIDC') {
      const redirectUri = this.getCallbackUrl();
      const authUrl = new URL(config.ssoUrl || config.metadataUrl || '');
      authUrl.searchParams.set('client_id', config.clientId || '');
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('scope', 'openid email profile');
      authUrl.searchParams.set('state', state);
      return { redirectUrl: authUrl.toString() };
    }

    const acsUrl = this.getCallbackUrl();
    const ssoUrl = config.ssoUrl || config.issuerUrl;
    if (!ssoUrl) throw new BadRequestException('SSO URL is not configured.');
    const redirectUrl = `${ssoUrl}${ssoUrl.includes('?') ? '&' : '?'}RelayState=${state}&ACS=${encodeURIComponent(acsUrl)}`;
    return { redirectUrl };
  }

  async handleCallback(params: {
    state: string;
    code?: string;
    email?: string;
    name?: string;
  }): Promise<{ accessToken: string; organizationId: string }> {
    const pending = pendingStates.get(params.state);
    if (!pending) throw new UnauthorizedException('Invalid or expired SSO state.');
    pendingStates.delete(params.state);

    const config = await this.ssoConfigRepo.findByOrganization(pending.organizationId);
    if (!config?.isEnabled) throw new UnauthorizedException('SSO configuration disabled.');

    let email = params.email?.trim().toLowerCase();
    let fullName = params.name?.trim();

    if (config.provider === 'OIDC' && params.code) {
      const token = await this.exchangeOidcCode(config, params.code);
      email = token.email?.toLowerCase();
      fullName = token.name ?? fullName;
    }

    if (!email) {
      throw new UnauthorizedException('SSO did not return an email address.');
    }

    if (config.domains) {
      const allowed = config.domains.split(',').map((d) => d.trim().toLowerCase());
      const domain = email.split('@')[1];
      if (allowed.length > 0 && domain && !allowed.includes(domain)) {
        throw new UnauthorizedException('Email domain is not allowed for this SSO configuration.');
      }
    }

    let user = await this.usersService.findByEmail(email);
    if (!user) {
      user = await this.usersService.createFromSso({
        email,
        fullName: fullName || email.split('@')[0],
      });
    }

    const membership = await this.orgMembersRepository.findByOrganizationAndUser(
      pending.organizationId,
      user.id,
    );
    if (!membership) {
      await this.orgMembersRepository.create({
        id: generateUuid(),
        organizationId: pending.organizationId,
        userId: user.id,
        role: 'member',
        status: 'ACTIVE',
        joinedAt: new Date(),
      });
    }

    const payload = { sub: user.id, email: user.email, roles: ['user'] };
    const accessToken = this.jwtService.sign(payload);
    return { accessToken, organizationId: pending.organizationId };
  }

  private getCallbackUrl(): string {
    const port = process.env.PORT || '3007';
    const prefix = process.env.API_PREFIX || 'api/v1';
    return process.env.SSO_CALLBACK_URL || `http://localhost:${port}/${prefix}/auth/sso/callback`;
  }

  private async exchangeOidcCode(
    config: { clientId: string | null; clientSecret: string | null; metadataUrl: string | null; issuerUrl: string | null },
    code: string,
  ): Promise<{ email?: string; name?: string }> {
    const tokenUrl = config.metadataUrl?.includes('/authorize')
      ? config.metadataUrl.replace('/authorize', '/token')
      : `${(config.issuerUrl || '').replace(/\/$/, '')}/oauth/token`;

    const redirectUri = this.getCallbackUrl();
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: config.clientId || '',
      client_secret: config.clientSecret || '',
    });

    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!tokenRes.ok) {
      throw new UnauthorizedException('OIDC token exchange failed.');
    }
    const tokenJson = (await tokenRes.json()) as { access_token?: string };
    if (!tokenJson.access_token) {
      throw new UnauthorizedException('OIDC token response missing access_token.');
    }

    const userInfoUrl = config.issuerUrl
      ? `${config.issuerUrl.replace(/\/$/, '')}/userinfo`
      : config.metadataUrl?.replace('/authorize', '/userinfo') || '';
    const userRes = await fetch(userInfoUrl, {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    if (!userRes.ok) {
      throw new UnauthorizedException('OIDC userinfo request failed.');
    }
    const profile = (await userRes.json()) as { email?: string; name?: string };
    return { email: profile.email, name: profile.name };
  }
}
