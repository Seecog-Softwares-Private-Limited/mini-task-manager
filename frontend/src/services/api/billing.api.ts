import { apiClient } from "@/services/api/client";
import type { Plan, Subscription, Invoice, UsageData } from "@/types/api";

export async function fetchPlans(): Promise<Plan[]> {
  const { data } = await apiClient.get<Plan[]>("/billing/plans");
  return data;
}

export async function fetchSubscription(): Promise<Subscription | null> {
  const { data } = await apiClient.get<Subscription | null>("/billing/subscription");
  return data;
}

export async function fetchSubscriptionByOrg(orgId: string): Promise<Subscription | null> {
  const { data } = await apiClient.get<Subscription | null>("/billing/subscription", {
    headers: { "X-Organization-Id": orgId },
  });
  return data;
}

export async function fetchUsage(): Promise<UsageData> {
  const { data } = await apiClient.get<UsageData>("/billing/usage");
  return data;
}

export interface UsageIndicator {
  planName: string | null;
  planSlug: string | null;
  isTrial: boolean;
  isTrialExpired: boolean;
  trialEndsAt: string | null;
  atLimit: boolean;
  users: { current: number; limit: number | null };
  projects: { current: number; limit: number | null };
  storageGb: { current: number; limit: number | null };
}

export async function fetchUsageIndicator(): Promise<UsageIndicator> {
  const { data } = await apiClient.get<UsageIndicator>("/billing/usage/indicator");
  return data;
}

export async function fetchUsageByOrg(orgId: string): Promise<UsageData> {
  const { data } = await apiClient.get<UsageData>("/billing/usage", {
    headers: { "X-Organization-Id": orgId },
  });
  return data;
}

export async function fetchFeatureFlags(): Promise<Record<string, unknown>> {
  const { data } = await apiClient.get<Record<string, unknown>>("/billing/features");
  return data;
}

export async function fetchInvoices(): Promise<Invoice[]> {
  const { data } = await apiClient.get<Invoice[]>("/billing/invoices");
  return data;
}

// ── New Razorpay Payment Flow ──

export interface CreateOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  planName: string;
  billingCycle: string;
}

export async function createOrder(planId: string, billingCycle: 'monthly' | 'yearly'): Promise<CreateOrderResponse> {
  const { data } = await apiClient.post<CreateOrderResponse>("/billing/create-order", { planId, billingCycle });
  return data;
}

export async function verifyPayment(params: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  planId: string;
  billingCycle: 'monthly' | 'yearly';
}): Promise<Subscription> {
  const { data } = await apiClient.post<Subscription>("/billing/verify-payment", params);
  return data;
}

export async function startTrial(planId?: string): Promise<Subscription> {
  const { data } = await apiClient.post<Subscription>("/billing/trial/start", { planId });
  return data;
}

export async function cancelSubscription(reason?: string): Promise<Subscription> {
  const { data } = await apiClient.post<Subscription>("/billing/cancel", { reason });
  return data;
}

export async function downgradeToFree(): Promise<Subscription> {
  const { data } = await apiClient.post<Subscription>("/billing/downgrade");
  return data;
}

