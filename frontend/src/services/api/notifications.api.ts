import { apiClient } from "@/services/api/client";
import type { Notification } from "@/types/api";
import type { PaginatedResult } from "@/types/api";

export async function fetchNotifications(
  page = 1,
  limit = 50
): Promise<PaginatedResult<Notification>> {
  const { data } = await apiClient.get<PaginatedResult<Notification>>("/notifications", {
    params: { page, limit },
  });
  return data;
}

export async function markNotificationAsRead(id: string): Promise<void> {
  await apiClient.patch(`/notifications/${id}/read`);
}

export async function markAllNotificationsAsRead(): Promise<{ count: number }> {
  const { data } = await apiClient.post<{ count: number }>("/notifications/read-all");
  return data;
}
