import { apiClient } from "@/services/api/client";
import type { Plan, Subscription, Invoice } from "@/types/api";

export async function fetchPlans(): Promise<Plan[]> {
  const { data } = await apiClient.get<Plan[]>("/billing/plans");
  return data;
}

/** Requires X-Organization-Id header (tenant context). */
export async function fetchSubscription(): Promise<Subscription | null> {
  const { data } = await apiClient.get<Subscription | null>("/billing/subscription");
  return data;
}

/** Fetch subscription for a specific organization. */
export async function fetchSubscriptionByOrg(orgId: string): Promise<Subscription | null> {
  const { data } = await apiClient.get<Subscription | null>("/billing/subscription", {
    headers: { "X-Organization-Id": orgId },
  });
  return data;
}

/** Requires X-Organization-Id header. */
export async function fetchInvoices(): Promise<Invoice[]> {
  const { data } = await apiClient.get<Invoice[]>("/billing/invoices");
  return data;
}
