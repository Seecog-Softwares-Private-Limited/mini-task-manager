export class SubscriptionResponseDto {
  id!: string;
  organizationId!: string;
  planId!: string;
  status!: string;
  startDate?: Date;
  endDate?: Date;
  trialEndsAt?: Date;
}
