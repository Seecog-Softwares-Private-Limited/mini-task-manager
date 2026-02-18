export declare class PlanEntity {
    id: string;
    name: string;
    pricePerUser: string | null;
    billingCycle: string;
    maxProjects: number | null;
    maxMembers: number | null;
    features: Record<string, unknown> | null;
    isActive: boolean;
    createdAt: Date;
}
