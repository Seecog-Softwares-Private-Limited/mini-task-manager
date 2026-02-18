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
