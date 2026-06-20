import { apiClient } from "@/services/api/client";
import type { BoardFilters } from "@/components/kanban/kanban-board";

export interface SavedViewDto {
  id: string;
  name: string;
  filters: BoardFilters;
  isShared: boolean;
  createdAt: string;
  userId?: string;
}

export async function fetchSavedViews(projectId: string): Promise<SavedViewDto[]> {
  const { data } = await apiClient.get<SavedViewDto[]>("/saved-views", {
    params: { projectId },
  });
  return data;
}

export async function createSavedView(payload: {
  projectId: string;
  name: string;
  filters: BoardFilters;
  isShared?: boolean;
}): Promise<SavedViewDto> {
  const { data } = await apiClient.post<SavedViewDto>("/saved-views", payload);
  return data;
}

export async function deleteSavedView(id: string): Promise<void> {
  await apiClient.delete(`/saved-views/${id}`);
}
