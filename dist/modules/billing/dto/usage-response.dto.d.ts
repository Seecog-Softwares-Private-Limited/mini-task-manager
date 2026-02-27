export declare class UsageBucketDto {
    current: number;
    limit: number | null;
    percentage: number | null;
}
export declare class UsageResponseDto {
    users: UsageBucketDto;
    projects: UsageBucketDto;
    storageGb: UsageBucketDto;
    automations: UsageBucketDto;
    integrations: UsageBucketDto;
    apiKeys: UsageBucketDto;
    planName: string | null;
    planSlug: string | null;
    subscriptionStatus: string | null;
    billingCycle: string | null;
    isTrial: boolean;
    trialEndsAt: Date | null;
    isTrialExpired: boolean;
}
