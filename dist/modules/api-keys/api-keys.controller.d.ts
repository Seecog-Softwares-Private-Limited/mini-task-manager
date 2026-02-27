import { ApiKeysService } from './api-keys.service';
export declare class ApiKeysController {
    private readonly apiKeysService;
    constructor(apiKeysService: ApiKeysService);
    list(tenantId?: string, userId?: string): Promise<{
        id: string;
        name: string;
        keyPrefix: string;
        lastUsedAt: Date | null;
        createdAt: Date;
    }[]>;
    create(body: {
        name: string;
    }, tenantId?: string, userId?: string): Promise<{
        id: string;
        organizationId: string;
        name: string;
        keyPrefix: string;
        lastUsedAt: Date | null;
        createdAt: Date;
        rawKey: string;
    }>;
    revoke(id: string, tenantId?: string, userId?: string): Promise<{
        success: boolean;
    }>;
}
