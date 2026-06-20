import { apiClient } from "@/services/api/client";

export interface IntegrationConnection {
  id: string;
  provider: string;
  label: string | null;
  isActive: boolean;
  config?: Record<string, unknown>;
  createdAt: string;
}

export async function fetchIntegrations(): Promise<IntegrationConnection[]> {
  const { data } = await apiClient.get<IntegrationConnection[]>("/integrations");
  return data;
}

export async function getSlackOAuthUrl(): Promise<{ url: string }> {
  const { data } = await apiClient.get<{ url: string }>("/integrations/slack/oauth-url");
  return data;
}

export async function completeSlackOAuth(code: string): Promise<{ provider: string; connected: boolean }> {
  const { data } = await apiClient.post("/integrations/slack/callback", { code });
  return data;
}

export async function disconnectIntegration(provider: string): Promise<void> {
  await apiClient.delete(`/integrations/${provider}`);
}
