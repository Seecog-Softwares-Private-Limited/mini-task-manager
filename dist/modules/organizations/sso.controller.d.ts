import { SSOService, type UpsertSSOConfigDto, type SSOConfigResponse } from './sso.service';
export declare class SSOController {
    private readonly ssoService;
    constructor(ssoService: SSOService);
    getConfig(tenantId: string): Promise<SSOConfigResponse | null>;
    upsertConfig(tenantId: string, dto: UpsertSSOConfigDto): Promise<SSOConfigResponse>;
    toggleEnabled(tenantId: string, body: {
        enabled: boolean;
    }): Promise<SSOConfigResponse>;
    deleteConfig(tenantId: string): Promise<{
        success: boolean;
    }>;
}
