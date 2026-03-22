export declare class SubscriptionResponseDto {
    id: string;
    organizationId: string;
    planId: string;
    planSlug: string;
    planName: string;
    billingCycle: string;
    status: string;
    startDate?: Date;
    endDate?: Date;
    trialEndsAt?: Date;
    cancelledAt?: Date;
    razorpaySubscriptionId?: string;
    daysRemaining?: number;
    isTrialExpired?: boolean;
}
