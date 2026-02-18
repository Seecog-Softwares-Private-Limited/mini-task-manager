import { apiClient } from "@/services/api/client";
import type { Organization } from "@/types/api";

export interface CreateOrganizationPayload {
  name: string;
  slug: string;
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
