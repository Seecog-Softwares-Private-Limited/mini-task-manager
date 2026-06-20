import { apiClient } from "@/services/api/client";

export interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
}

export async function fetchWebhooks(): Promise<WebhookEndpoint[]> {
  const { data } = await apiClient.get<WebhookEndpoint[]>("/webhooks");
  return data;
}

export async function createWebhook(payload: {
  name: string;
  url: string;
  events: string[];
}): Promise<WebhookEndpoint & { secret?: string }> {
  const { data } = await apiClient.post("/webhooks", payload);
  return data;
}

export async function deleteWebhook(id: string): Promise<void> {
  await apiClient.delete(`/webhooks/${id}`);
}
