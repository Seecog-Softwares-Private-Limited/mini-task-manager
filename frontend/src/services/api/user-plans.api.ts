import { apiClient } from "@/services/api/client";

export type UserPlanSlug = "free" | "silver" | "gold";

export interface PlanListItem {
  slug: UserPlanSlug;
  name: string;
  price: number;
  currency: "INR";
  priceLabel: string;
  limits: {
    maxWorkspaces: number | null;
    maxMembersPerWorkspace: number | null;
    storageBytes: number;
  };
  benefits: string[];
  allowCoupon?: boolean;
}

export interface CouponValidationResult {
  valid: boolean;
  code: string;
  plan: UserPlanSlug;
  discountPercent: number;
  originalAmountInr: number;
  finalAmountInr: number;
  savingsInr: number;
  message?: string;
}

export interface PlanUsageBucket {
  used: number;
  limit: number | null;
}

export interface CurrentPlanResponse {
  plan: UserPlanSlug;
  definition: {
    slug: UserPlanSlug;
    name: string;
    pricing: { priceMonthlyInr: number; currency: "INR"; label: string };
    limits: {
      maxWorkspaces: number | null;
      maxMembersPerWorkspace: number | null;
      storageBytes: number;
    };
    benefits: string[];
  };
  planStartedAt: string | null;
  planExpiresAt: string | null;
  usage: {
    workspaces: PlanUsageBucket;
    members: PlanUsageBucket;
    storage: { usedBytes: number; limitBytes: number };
  };
}

export interface UpgradeOption {
  plan: UserPlanSlug;
  price: number;
  currency: "INR";
  benefits: string[];
}

export interface LimitExceededErrorBody {
  error: "LIMIT_EXCEEDED";
  limitType: "workspace" | "member" | "storage";
  currentPlan: UserPlanSlug;
  currentUsage: number;
  planLimit: number | null;
  message: string;
  maximumPlan?: boolean;
  upgradeTo: UpgradeOption[];
}

export async function fetchUserPlans(): Promise<PlanListItem[]> {
  const { data } = await apiClient.get<PlanListItem[]>("/plans");
  return data;
}

export async function fetchCurrentUserPlan(): Promise<CurrentPlanResponse> {
  const { data } = await apiClient.get<CurrentPlanResponse>("/plans/current");
  return data;
}

export async function fetchUserPlanUsage(): Promise<CurrentPlanResponse> {
  const { data } = await apiClient.get<CurrentPlanResponse>("/plans/usage");
  return data;
}

export async function validatePlanCoupon(
  code: string,
  plan: UserPlanSlug
): Promise<CouponValidationResult> {
  const { data } = await apiClient.post<CouponValidationResult>("/plans/validate-coupon", {
    code,
    plan,
  });
  return data;
}

export async function upgradeUserPlan(
  plan: UserPlanSlug,
  paymentId?: string,
  couponCode?: string
): Promise<{
  requiresPayment?: boolean;
  payment?: { paymentId: string; gatewayUrl: string; amountInr?: number };
  plan?: UserPlanSlug;
  originalAmountInr?: number;
  finalAmountInr?: number;
  couponApplied?: boolean;
}> {
  const { data } = await apiClient.post("/plans/upgrade", { plan, paymentId, couponCode });
  return data;
}

export function isLimitExceededError(err: unknown): err is { response: { data: LimitExceededErrorBody } } {
  const body = (err as { response?: { data?: LimitExceededErrorBody } })?.response?.data;
  return body?.error === "LIMIT_EXCEEDED";
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${Math.round(bytes / 1024 ** 2)} MB`;
  return `${bytes} B`;
}
