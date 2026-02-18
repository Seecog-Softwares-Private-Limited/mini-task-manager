import { apiClient } from "@/services/api/client";
import type { Organization } from "@/types/api";
import { fetchProjectsByOrg } from "@/services/api/projects.api";
import { fetchTasksByProject } from "@/services/api/tasks.api";

export interface CreateOrganizationPayload {
  name: string;
  slug: string;
  logoUrl?: string;
}

/** Check if an organization slug is available (for create form). */
export async function checkSlugAvailable(slug: string): Promise<{ available: boolean }> {
  const { data } = await apiClient.get<{ available: boolean }>("/organizations/slug/available", {
    params: { slug: slug.trim().toLowerCase() },
  });
  return data;
}

export async function fetchOrganizations(): Promise<Organization[]> {
  const { data } = await apiClient.get<Organization[]>("/organizations");
  return data;
}

export async function createOrganization(payload: CreateOrganizationPayload): Promise<Organization> {
  const { data } = await apiClient.post<Organization>("/organizations", payload);
  return data;
}

export async function fetchOrganization(id: string): Promise<Organization | null> {
  const { data } = await apiClient.get<Organization | null>(`/organizations/${id}`, {
    headers: { "X-Organization-Id": id },
  });
  return data;
}

/** Archive or unarchive an organization. Owner only. */
export async function updateOrganization(
  orgId: string,
  payload: { isArchived?: boolean }
): Promise<Organization> {
  const { data } = await apiClient.patch<Organization>(`/organizations/${orgId}`, payload, {
    headers: { "X-Organization-Id": orgId },
  });
  return data;
}

/** Delete an organization permanently. Owner only. Irreversible. */
export async function deleteOrganization(orgId: string): Promise<{ success: boolean }> {
  const { data } = await apiClient.delete<{ success: boolean }>(`/organizations/${orgId}`, {
    headers: { "X-Organization-Id": orgId },
  });
  return data;
}

/** Aggregated health data for org cards: overdue count and total tasks across all projects. */
export interface OrgHealthData {
  overdueCount: number;
  totalTasks: number;
}

/** Fetch health metrics for an org (overdue tasks across all projects). Used for health indicator on org cards. */
export async function fetchOrgHealthData(orgId: string): Promise<OrgHealthData> {
  const projects = await fetchProjectsByOrg(orgId);
  const activeProjects = projects.filter((p) => !p.isArchived);
  let overdueCount = 0;
  let totalTasks = 0;
  const now = Date.now();
  for (const project of activeProjects) {
    const result = await fetchTasksByProject(project.id, 1, 100, { organizationId: orgId });
    const tasks = result.data ?? [];
    totalTasks += result.meta?.total ?? tasks.length;
    overdueCount += tasks.filter(
      (t) => t.dueDate && new Date(t.dueDate).getTime() < now
    ).length;
  }
  return { overdueCount, totalTasks };
}

/** Transfer organization ownership to another member. Stub: backend may expose PATCH /organizations/:id/owner or similar. */
export async function transferOrganizationOwnership(
  orgId: string,
  newOwnerUserId: string
): Promise<Organization> {
  const { data } = await apiClient.patch<Organization>(
    `/organizations/${orgId}/owner`,
    { ownerId: newOwnerUserId }
  );
  return data;
}
