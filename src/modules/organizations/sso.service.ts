import { Injectable, ForbiddenException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { SSOConfigRepository } from './repositories/sso-config.repository';
import { SSOConfigEntity } from './entities/sso-config.entity';
import { UsageService } from '../billing/usage.service';

export interface UpsertSSOConfigDto {
  provider: 'SAML' | 'OIDC';
  label?: string;
  issuerUrl?: string;
  ssoUrl?: string;
  clientId?: string;
  clientSecret?: string;
  certificate?: string;
  metadataUrl?: string;
  domains?: string;
  isEnabled?: boolean;
}

export interface SSOConfigResponse {
  id: string;
  organizationId: string;
  provider: string;
  label: string | null;
  issuerUrl: string | null;
  ssoUrl: string | null;
  clientId: string | null;
  metadataUrl: string | null;
  domains: string | null;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class SSOService {
  constructor(
    private readonly ssoConfigRepo: SSOConfigRepository,
    @Inject(forwardRef(() => UsageService))
    private readonly usageService: UsageService,
  ) {}

  private toResponse(entity: SSOConfigEntity): SSOConfigResponse {
    return {
      id: entity.id,
      organizationId: entity.organizationId,
      provider: entity.provider,
      label: entity.label,
      issuerUrl: entity.issuerUrl,
      ssoUrl: entity.ssoUrl,
      clientId: entity.clientId,
      metadataUrl: entity.metadataUrl,
      domains: entity.domains,
      isEnabled: entity.isEnabled,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  /**
   * Check if the organization's plan allows SSO.
   */
  async assertSSOAllowed(organizationId: string): Promise<void> {
    const flags = await this.usageService.getFeatureFlags(organizationId);
    if (!flags.sso) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'FEATURE_NOT_AVAILABLE',
        code: 'SSO_NOT_AVAILABLE',
        message: 'SSO is not available on your current plan. Upgrade to Pro or Enterprise to enable SSO.',
        upgradeUrl: '/dashboard/billing',
      });
    }
  }

  async getConfig(organizationId: string): Promise<SSOConfigResponse | null> {
    const entity = await this.ssoConfigRepo.findByOrganization(organizationId);
    return entity ? this.toResponse(entity) : null;
  }

  async upsertConfig(organizationId: string, dto: UpsertSSOConfigDto): Promise<SSOConfigResponse> {
    await this.assertSSOAllowed(organizationId);

    const entity = await this.ssoConfigRepo.upsert(organizationId, {
      provider: dto.provider,
      label: dto.label ?? null,
      issuerUrl: dto.issuerUrl ?? null,
      ssoUrl: dto.ssoUrl ?? null,
      clientId: dto.clientId ?? null,
      clientSecret: dto.clientSecret ?? null,
      certificate: dto.certificate ?? null,
      metadataUrl: dto.metadataUrl ?? null,
      domains: dto.domains ?? null,
      isEnabled: dto.isEnabled ?? false,
    });

    return this.toResponse(entity);
  }

  async deleteConfig(organizationId: string): Promise<void> {
    const existing = await this.ssoConfigRepo.findByOrganization(organizationId);
    if (!existing) {
      throw new NotFoundException('No SSO configuration found for this organization.');
    }
    await this.ssoConfigRepo.remove(organizationId);
  }

  async toggleEnabled(organizationId: string, enabled: boolean): Promise<SSOConfigResponse> {
    await this.assertSSOAllowed(organizationId);

    const existing = await this.ssoConfigRepo.findByOrganization(organizationId);
    if (!existing) {
      throw new NotFoundException('No SSO configuration found. Create one first.');
    }

    const updated = await this.ssoConfigRepo.upsert(organizationId, {
      isEnabled: enabled,
    });
    return this.toResponse(updated);
  }
}
