import { OrganizationEntity } from './organization.entity';
export declare class SSOConfigEntity {
    id: string;
    organizationId: string;
    provider: string;
    label: string | null;
    issuerUrl: string | null;
    ssoUrl: string | null;
    clientId: string | null;
    clientSecret: string | null;
    certificate: string | null;
    metadataUrl: string | null;
    domains: string | null;
    isEnabled: boolean;
    createdAt: Date;
    updatedAt: Date;
    organization?: OrganizationEntity;
}
