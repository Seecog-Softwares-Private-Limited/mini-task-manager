export declare const CHECK_LIMIT_KEY = "check_subscription_limit";
export type LimitResource = 'users' | 'projects' | 'storageGb' | 'automations' | 'integrations' | 'apiKeys';
export declare const CheckSubscriptionLimit: (resource: LimitResource) => import("@nestjs/common").CustomDecorator<string>;
