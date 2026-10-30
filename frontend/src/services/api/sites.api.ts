import { apiClient } from "@/services/api/client";
import type { Site } from "@/types/api";

export interface CreateSitePayload {
  name: string;
  address?: string;
}

export interface UpdateSitePayload {
  name?: string;
  address?: string;
  isArchived?: boolean;
}

export async function fetchSites(): Promise<Site[]> {
  const { data } = await apiClient.get<Site[]>("/sites");
  return data;
}

export async function fetchSite(id: string): Promise<Site | null> {
  const { data } = await apiClient.get<Site | null>(`/sites/${id}`);
  return data;
}

export async function createSite(payload: CreateSitePayload): Promise<Site> {
  const { data } = await apiClient.post<Site>("/sites", payload);
  return data;
}

export async function updateSite(id: string, payload: UpdateSitePayload): Promise<Site> {
  const { data } = await apiClient.patch<Site>(`/sites/${id}`, payload);
  return data;
}

export async function deleteSite(id: string): Promise<void> {
  await apiClient.delete(`/sites/${id}`);
}
