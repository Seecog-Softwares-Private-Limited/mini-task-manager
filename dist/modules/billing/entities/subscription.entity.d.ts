import { OrganizationEntity } from '../../organizations/entities/organization.entity';
import { PlanEntity } from './plan.entity';
export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PAST_DUE';
export type BillingCycle = 'monthly' | 'yearly';
export declare class SubscriptionEntity {
    id: string;
    organizationId: string;
    planId: string;
    billingCycle: BillingCycle;
    status: SubscriptionStatus;
    startDate: Date | null;
    endDate: Date | null;
    trialEndsAt: Date | null;
    razorpaySubscriptionId: string | null;
    razorpayCustomerId: string | null;
    cancelledAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    organization?: OrganizationEntity;
    plan?: PlanEntity;
}
