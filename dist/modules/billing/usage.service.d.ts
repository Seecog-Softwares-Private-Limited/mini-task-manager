import { DataSource } from 'typeorm';
import { PlansRepository } from './repositories/plans.repository';
import { SubscriptionsRepository } from './repositories/subscriptions.repository';
export interface UsageBucket {
    current: number;
    limit: number | null;
}
export interface OrganizationUsage {
    users: UsageBucket;
    projects: UsageBucket;
    storageGb: UsageBucket;
    automations: UsageBucket;
    integrations: UsageBucket;
    apiKeys: UsageBucket;
}
export interface UsageCheckResult {
    allowed: boolean;
    resource: string;
    current: number;
    limit: number | null;
    message: string;
}
export declare class UsageService {
    private readonly plansRepository;
    private readonly subscriptionsRepository;
    private readonly dataSource;
    private readonly logger;
    constructor(plansRepository: PlansRepository, subscriptionsRepository: SubscriptionsRepository, dataSource: DataSource);
    private getPlanLimits;
    getOrganizationUsage(organizationId: string): Promise<OrganizationUsage>;
    checkLimit(organizationId: string, resource: 'users' | 'projects' | 'storageGb' | 'automations' | 'integrations' | 'apiKeys', increment?: number): Promise<UsageCheckResult>;
    getFeatureFlags(organizationId: string): Promise<Record<string, unknown>>;
    private getDefaultFeatureFlags;
}
