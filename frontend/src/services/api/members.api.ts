import { apiClient } from "@/services/api/client";
import type { OrgMember, ProjectMember } from "@/types/api";

export async function fetchOrgMembers(orgId: string): Promise<OrgMember[]> {
  const { data } = await apiClient.get<OrgMember[]>(`/organizations/${orgId}/members`, {
    headers: { "X-Organization-Id": orgId },
  });
  return data;
}

/** Fetch organization member count (lightweight, for org cards). */
export async function fetchOrgMemberCount(orgId: string): Promise<number> {
  const { data } = await apiClient.get<{ count: number }>(`/organizations/${orgId}/members/count`, {
    headers: { "X-Organization-Id": orgId },
  });
  return data.count;
}

export interface InviteOrgMemberPayload {
  email: string;
  role: string;
}

export async function inviteOrgMember(
  orgId: string,
  payload: InviteOrgMemberPayload
): Promise<OrgMember> {
  const { data } = await apiClient.post<OrgMember>(`/organizations/${orgId}/members`, payload);
  return data;
}

export async function removeOrgMember(
  orgId: string,
  memberId: string
): Promise<void> {
  await apiClient.delete(`/organizations/${orgId}/members/${memberId}`);
}

export async function updateOrgMemberRole(
  orgId: string,
  memberId: string,
  role: string
): Promise<OrgMember> {
  const { data } = await apiClient.patch<OrgMember>(
    `/organizations/${orgId}/members/${memberId}`,
    { role }
  );
  return data;
}

export async function fetchProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const { data } = await apiClient.get<ProjectMember[]>(`/projects/${projectId}/members`);
  return data;
}

/** Backend expects uppercase role: POST /projects/:projectId/members */
export type ProjectMemberRole = "ADMIN" | "CONTRIBUTOR" | "VIEWER";

export interface AddProjectMemberPayload {
  userId: string;
  role: ProjectMemberRole;
}

export async function addProjectMember(
  projectId: string,
  payload: AddProjectMemberPayload
): Promise<ProjectMember> {
  const { data } = await apiClient.post<ProjectMember>(
    `/projects/${projectId}/members`,
    payload
  );
  return data;
}

export async function removeProjectMember(
  projectId: string,
  memberId: string
): Promise<void> {
  await apiClient.delete(`/projects/${projectId}/members/${memberId}`);
}

export async function updateProjectMemberRole(
  projectId: string,
  memberId: string,
  role: string
): Promise<ProjectMember> {
  const { data } = await apiClient.patch<ProjectMember>(
    `/projects/${projectId}/members/${memberId}`,
    { role }
  );
  return data;
}
