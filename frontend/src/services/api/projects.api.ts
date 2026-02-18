import { apiClient } from "@/services/api/client";
import type { Project } from "@/types/api";

export interface CreateProjectPayload {
  name: string;
  description?: string;
  visibility?: string;
}

export async function fetchProjects(): Promise<Project[]> {
  const { data } = await apiClient.get<Project[]>("/projects");
  return data;
}

/** Fetch projects for a specific organization (for org switcher / org list). */
export async function fetchProjectsByOrg(orgId: string): Promise<Project[]> {
  const { data } = await apiClient.get<Project[]>("/projects", {
    headers: { "X-Organization-Id": orgId },
  });
  return data;
}

/** Fetch project count for an organization (lightweight, for org cards). */
export async function fetchProjectsCountByOrg(orgId: string): Promise<number> {
  const { data } = await apiClient.get<{ count: number }>("/projects/count", {
    headers: { "X-Organization-Id": orgId },
  });
  return data.count;
}

export async function fetchProject(id: string): Promise<Project | null> {
  const { data } = await apiClient.get<Project | null>(`/projects/${id}`);
  return data;
}

export async function createProject(payload: CreateProjectPayload): Promise<Project> {
  const { data } = await apiClient.post<Project>("/projects", payload);
  return data;
}

export interface UpdateProjectPayload {
  name?: string;
  description?: string;
  visibility?: string;
  isArchived?: boolean;
}

export async function updateProject(
  id: string,
  payload: UpdateProjectPayload
): Promise<Project> {
  const { data } = await apiClient.patch<Project>(`/projects/${id}`, payload);
  return data;
}
