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

export interface UserPlanRazorpayOrder {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  amountInr: number;
  planName?: string;
}

export interface CreateUserPlanOrderResponse {
  requiresPayment: boolean;
  plan?: UserPlanSlug;
  planExpiresAt?: string;
  message?: string;
  razorpay?: UserPlanRazorpayOrder;
  originalAmountInr?: number;
  finalAmountInr?: number;
  couponApplied?: boolean;
}

export async function createUserPlanOrder(
  plan: UserPlanSlug,
  couponCode?: string
): Promise<CreateUserPlanOrderResponse> {
  const { data } = await apiClient.post<CreateUserPlanOrderResponse>("/plans/create-order", {
    plan,
    couponCode,
  });
  return data;
}

export async function verifyUserPlanPayment(params: {
  plan: UserPlanSlug;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  couponCode?: string;
}): Promise<{ plan: UserPlanSlug; planExpiresAt: string }> {
  const { data } = await apiClient.post("/plans/verify-payment", params);
  return data;
}

/** @deprecated Use createUserPlanOrder + verifyUserPlanPayment */
export async function upgradeUserPlan(
  plan: UserPlanSlug,
  _paymentId?: string,
  couponCode?: string
): Promise<CreateUserPlanOrderResponse> {
  const { data } = await apiClient.post<CreateUserPlanOrderResponse>("/plans/create-order", {
    plan,
    couponCode,
  });
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
