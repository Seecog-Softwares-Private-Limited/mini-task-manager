import { apiClient } from "@/services/api/client";
import type { Project } from "@/types/api";

export interface CreateProjectPayload {
  name: string;
  description?: string;
  visibility?: string;
  iconUrl?: string;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
}

export async function fetchProjectTemplates(): Promise<ProjectTemplate[]> {
  const { data } = await apiClient.get<ProjectTemplate[]>("/projects/templates");
  return data;
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

/**
 * Create a project in a workspace. Pass `organizationId` to create under a specific workspace
 * (sets `X-Organization-Id`); otherwise the stored tenant org is used.
 */
export async function createProject(
  payload: CreateProjectPayload,
  organizationId?: string
): Promise<Project> {
  const { data } = await apiClient.post<Project>("/projects", payload, {
    headers: organizationId ? { "X-Organization-Id": organizationId } : undefined,
  });
  return data;
}

export interface UpdateProjectPayload {
  name?: string;
  description?: string;
  visibility?: string;
  isArchived?: boolean;
  /** Omit to leave unchanged; send "" to clear stored icon */
  iconUrl?: string;
}

export async function updateProject(
  id: string,
  payload: UpdateProjectPayload
): Promise<Project> {
  const { data } = await apiClient.patch<Project>(`/projects/${id}`, payload);
  return data;
}

export async function seedDemoTasks(projectId: string): Promise<{ created: number }> {
  const { data } = await apiClient.post<{ created: number }>(
    `/projects/${projectId}/seed-demo-tasks`
  );
  return data;
}
