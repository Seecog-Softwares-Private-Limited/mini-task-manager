import { apiClient } from "@/services/api/client";
import type { PaginatedResult, Plan } from "@/types/api";

export interface AdminOrganizationListItem {
  id: string;
  name: string;
  slug: string;
  status: "ACTIVE" | "SUSPENDED" | "DELETED";
  ownerEmail: string;
  ownerName: string;
  memberCount: number;
  planName: string | null;
  planSlug: string | null;
  subscriptionStatus: string | null;
  createdAt: string;
  suspendedAt: string | null;
}

export interface AdminOrganizationDetail extends AdminOrganizationListItem {
  suspensionReason: string | null;
  planId: string | null;
  usage: {
    users: { current: number; limit: number | null };
    projects: { current: number; limit: number | null };
    storageGb: { current: number; limit: number | null };
  };
}

export async function fetchAdminOrganizations(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: "ALL" | "ACTIVE" | "SUSPENDED";
}): Promise<PaginatedResult<AdminOrganizationListItem>> {
  const { data } = await apiClient.get<{
    data: AdminOrganizationListItem[];
    meta: PaginatedResult<AdminOrganizationListItem>["meta"];
  }>("/admin/organizations", { params });
  return { data: data.data, meta: data.meta };
}

export async function fetchAdminOrganization(id: string): Promise<AdminOrganizationDetail> {
  const { data } = await apiClient.get<AdminOrganizationDetail>(`/admin/organizations/${id}`);
  return data;
}

export async function adminSetOrganizationPlan(
  orgId: string,
  planId: string,
  billingCycle?: "monthly" | "yearly"
): Promise<AdminOrganizationDetail> {
  const { data } = await apiClient.patch<AdminOrganizationDetail>(
    `/admin/organizations/${orgId}/plan`,
    { planId, billingCycle }
  );
  return data;
}

export async function adminSuspendOrganization(
  orgId: string,
  reason?: string
): Promise<AdminOrganizationDetail> {
  const { data } = await apiClient.post<AdminOrganizationDetail>(
    `/admin/organizations/${orgId}/suspend`,
    { reason }
  );
  return data;
}

export async function adminUnsuspendOrganization(orgId: string): Promise<AdminOrganizationDetail> {
  const { data } = await apiClient.post<AdminOrganizationDetail>(
    `/admin/organizations/${orgId}/unsuspend`
  );
  return data;
}

export async function adminDeleteOrganization(orgId: string): Promise<{ success: true; deletedOrganizationId: string }> {
  const { data } = await apiClient.delete<{ success: true; deletedOrganizationId: string }>(
    `/admin/organizations/${orgId}`
  );
  return data;
}

export async function fetchPlansForAdmin(): Promise<Plan[]> {
  const { data } = await apiClient.get<Plan[]>("/billing/plans");
  return data;
}
