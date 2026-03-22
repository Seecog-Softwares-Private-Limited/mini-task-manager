import { ApiKeysRepository } from './api-keys.repository';
import { OrganizationsService } from '../organizations/organizations.service';
import { UsageService } from '../billing/usage.service';
export declare class ApiKeysService {
    private readonly apiKeysRepository;
    private readonly organizationsService;
    private readonly usageService;
    constructor(apiKeysRepository: ApiKeysRepository, organizationsService: OrganizationsService, usageService: UsageService);
    listByOrganization(organizationId: string, userId: string): Promise<import("./entities/api-key.entity").ApiKeyEntity[]>;
    create(organizationId: string, userId: string, name: string): Promise<{
        id: string;
        organizationId: string;
        name: string;
        keyPrefix: string;
        lastUsedAt: Date | null;
        createdAt: Date;
        rawKey: string;
    }>;
    revoke(id: string, organizationId: string, userId: string): Promise<void>;
}
