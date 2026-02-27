export class PlanResponseDto {
  id!: string;
  slug!: string;
  name!: string;
  priceMonthly!: number;
  priceYearly!: number;
  currency!: string;
  maxUsers!: number | null;
  maxProjects!: number | null;
  storageLimitGb!: number | null;
  automationLimit!: number | null;
  integrationLimit!: number | null;
  maxApiKeys!: number | null;
  apiEnabled!: boolean;
  ssoEnabled!: boolean;
  auditLogsEnabled!: boolean;
  customWorkflows!: boolean;
  advancedReporting!: boolean;
  timeTracking!: boolean;
  prioritySupport!: boolean;
  slaUptime!: string | null;
  features?: Record<string, unknown>;
  isPopular!: boolean;
  displayOrder!: number;
}
