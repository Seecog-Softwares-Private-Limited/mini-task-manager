import { SSOConfigRepository } from './repositories/sso-config.repository';
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
export declare class SSOService {
    private readonly ssoConfigRepo;
    private readonly usageService;
    constructor(ssoConfigRepo: SSOConfigRepository, usageService: UsageService);
    private toResponse;
    assertSSOAllowed(organizationId: string): Promise<void>;
    getConfig(organizationId: string): Promise<SSOConfigResponse | null>;
    upsertConfig(organizationId: string, dto: UpsertSSOConfigDto): Promise<SSOConfigResponse>;
    deleteConfig(organizationId: string): Promise<void>;
    toggleEnabled(organizationId: string, enabled: boolean): Promise<SSOConfigResponse>;
}
