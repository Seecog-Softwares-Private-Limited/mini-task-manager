import { apiClient } from "@/services/api/client";
import type { Epic, EpicStatus } from "@/types/api";

export interface CreateEpicPayload {
  projectId: string;
  title: string;
  description?: string;
  color?: string;
  status?: EpicStatus;
  startDate?: string;
  dueDate?: string;
}

export interface UpdateEpicPayload {
  title?: string;
  description?: string;
  color?: string;
  status?: EpicStatus;
  startDate?: string;
  dueDate?: string;
}

export async function fetchEpics(filters?: { projectId?: string }): Promise<Epic[]> {
  const { data } = await apiClient.get<Epic[]>("/epics", { params: filters });
  return data;
}

export async function fetchEpic(id: string): Promise<Epic | null> {
  const { data } = await apiClient.get<Epic | null>(`/epics/${id}`);
  return data;
}

export async function createEpic(payload: CreateEpicPayload): Promise<Epic> {
  const { data } = await apiClient.post<Epic>("/epics", payload);
  return data;
}

export async function updateEpic(id: string, payload: UpdateEpicPayload): Promise<Epic> {
  const { data } = await apiClient.patch<Epic>(`/epics/${id}`, payload);
  return data;
}

export async function deleteEpic(id: string): Promise<void> {
  await apiClient.delete(`/epics/${id}`);
}
