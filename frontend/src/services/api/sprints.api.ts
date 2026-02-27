import { apiClient } from "@/services/api/client";
import type { Sprint } from "@/types/api";

export interface CreateSprintPayload {
  projectId: string;
  name: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}

export async function fetchSprintsByProject(projectId: string): Promise<Sprint[]> {
  const { data } = await apiClient.get<Sprint[]>(`/sprints/project/${projectId}`);
  return data;
}

export async function fetchSprint(sprintId: string): Promise<Sprint | null> {
  const { data } = await apiClient.get<Sprint | null>(`/sprints/${sprintId}`);
  return data;
}

export async function createSprint(payload: CreateSprintPayload): Promise<Sprint> {
  const { data } = await apiClient.post<Sprint>("/sprints", payload);
  return data;
}
