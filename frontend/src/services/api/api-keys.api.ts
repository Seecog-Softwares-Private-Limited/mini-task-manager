import { apiClient } from "@/services/api/client";

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface CreateApiKeyResponse extends ApiKey {
  rawKey: string;
}

export async function fetchApiKeys(): Promise<ApiKey[]> {
  const { data } = await apiClient.get<ApiKey[]>("/api-keys");
  return data;
}

export async function createApiKey(name: string): Promise<CreateApiKeyResponse> {
  const { data } = await apiClient.post<CreateApiKeyResponse>("/api-keys", { name });
  return data;
}

export async function revokeApiKey(id: string): Promise<void> {
  await apiClient.delete(`/api-keys/${id}`);
}
