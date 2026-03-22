export { CheckSubscriptionLimit, type LimitResource } from './decorators/check-limit.decorator';
export { SubscriptionGuard } from './guards/subscription.guard';
export { UsageService, type OrganizationUsage, type UsageCheckResult } from './usage.service';
export interface SubscriptionLimitErrorBody {
    statusCode: number;
    error: string;
    code: 'SUBSCRIPTION_LIMIT_EXCEEDED';
    resource: string;
    current: number;
    limit: number | null;
    message: string;
    upgradeUrl: string;
}
export declare function isSubscriptionLimitError(err: unknown): err is {
    response?: {
        data?: SubscriptionLimitErrorBody;
    };
};
