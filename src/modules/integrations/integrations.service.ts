import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { IntegrationsRepository } from './integrations.repository';
import { UsageService } from '../billing/usage.service';
import { OrganizationsService } from '../organizations/organizations.service';

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(
    private readonly integrationsRepository: IntegrationsRepository,
    private readonly usageService: UsageService,
    private readonly organizationsService: OrganizationsService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async list(organizationId: string, userId: string) {
    await this.assertAccess(organizationId, userId);
    const rows = await this.integrationsRepository.findByOrganization(organizationId);
    return rows.map((r) => ({
      id: r.id,
      provider: r.provider,
      label: r.label,
      isActive: r.isActive,
      config: r.configJson,
      createdAt: r.createdAt,
    }));
  }

  getSlackOAuthUrl(organizationId: string, userId: string): { url: string } {
    const clientId = process.env.SLACK_CLIENT_ID;
    if (!clientId) {
      throw new BadRequestException('Slack integration is not configured on this server.');
    }
    const redirectUri = process.env.SLACK_REDIRECT_URI || 'http://localhost:3008/dashboard/settings/integrations/slack/callback';
    const state = Buffer.from(JSON.stringify({ organizationId, userId })).toString('base64url');
    const url = new URL('https://slack.com/oauth/v2/authorize');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('scope', 'incoming-webhook,chat:write');
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('state', state);
    return { url: url.toString() };
  }

  async completeSlackOAuth(
    organizationId: string,
    userId: string,
    code: string,
  ) {
    await this.assertAccess(organizationId, userId);
    const check = await this.usageService.checkLimit(organizationId, 'integrations', 1);
    if (!check.allowed) {
      throw new ForbiddenException(check.message || 'Integration limit reached.');
    }

    const clientId = process.env.SLACK_CLIENT_ID;
    const clientSecret = process.env.SLACK_CLIENT_SECRET;
    const redirectUri = process.env.SLACK_REDIRECT_URI || 'http://localhost:3008/dashboard/settings/integrations/slack/callback';
    if (!clientId || !clientSecret) {
      throw new BadRequestException('Slack OAuth is not configured.');
    }

    const body = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    });
    const tokenRes = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const tokenJson = (await tokenRes.json()) as {
      ok?: boolean;
      access_token?: string;
      incoming_webhook?: { url?: string; channel?: string };
      team?: { name?: string };
    };
    if (!tokenJson.ok || !tokenJson.access_token) {
      throw new BadRequestException('Slack OAuth failed.');
    }

    await this.integrationsRepository.upsert({
      organizationId,
      provider: 'slack',
      label: tokenJson.team?.name ?? 'Slack',
      accessToken: tokenJson.access_token,
      configJson: {
        webhookUrl: tokenJson.incoming_webhook?.url,
        channel: tokenJson.incoming_webhook?.channel,
      },
      isActive: true,
      connectedBy: userId,
    });
    await this.syncIntegrationCount(organizationId);
    return { provider: 'slack', connected: true };
  }

  async disconnect(organizationId: string, userId: string, provider: string) {
    await this.assertAccess(organizationId, userId);
    await this.integrationsRepository.delete(organizationId, provider);
    await this.syncIntegrationCount(organizationId);
  }

  async notifySlack(
    organizationId: string,
    text: string,
    context?: Record<string, unknown>,
  ) {
    const integration = await this.integrationsRepository.findByOrgAndProvider(organizationId, 'slack');
    if (!integration?.isActive) return;
    const webhookUrl = integration.configJson?.webhookUrl as string | undefined;
    if (!webhookUrl) return;
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          blocks: context
            ? [{ type: 'section', text: { type: 'mrkdwn', text } }]
            : undefined,
        }),
      });
    } catch (err) {
      this.logger.warn(`Slack notify failed: ${String(err)}`);
    }
  }

  private async syncIntegrationCount(organizationId: string) {
    const count = await this.integrationsRepository.countActive(organizationId);
    await this.dataSource.query(
      `INSERT INTO organization_usage (organization_id, automation_used, integrations_used)
       VALUES (?, 0, ?)
       ON DUPLICATE KEY UPDATE integrations_used = ?`,
      [organizationId, count, count],
    );
  }

  private async assertAccess(organizationId: string, userId: string) {
    const ok = await this.organizationsService.canAccess(organizationId, userId);
    if (!ok) throw new ForbiddenException('Access denied');
  }
}
