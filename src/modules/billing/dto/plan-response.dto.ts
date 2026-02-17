export class PlanResponseDto {
  id!: string;
  name!: string;
  pricePerUser!: string | null;
  billingCycle!: string;
  maxProjects?: number;
  maxMembers?: number;
  features?: Record<string, unknown>;
}
