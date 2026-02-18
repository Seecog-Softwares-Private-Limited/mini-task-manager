import { OrganizationEntity } from '../../organizations/entities/organization.entity';
import { PlanEntity } from './plan.entity';
export declare class SubscriptionEntity {
    id: string;
    organizationId: string;
    planId: string;
    status: string;
    startDate: Date | null;
    endDate: Date | null;
    trialEndsAt: Date | null;
    createdAt: Date;
    organization?: OrganizationEntity;
    plan?: PlanEntity;
}
