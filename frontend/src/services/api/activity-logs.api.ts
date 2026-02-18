import { apiClient } from "@/services/api/client";
import type { ActivityLog } from "@/types/api";
import type { PaginatedResult } from "@/types/api";

export async function fetchActivityLogs(
  page = 1,
  limit = 20
): Promise<PaginatedResult<ActivityLog>> {
  const { data } = await apiClient.get<PaginatedResult<ActivityLog>>("/activity-logs", {
    params: { page, limit },
  });
  return data;
}
