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

/** Fetch most recent activity timestamp for an org (for org cards). Returns ISO string or null. */
export async function fetchLastActivityByOrg(orgId: string): Promise<string | null> {
  const { data } = await apiClient.get<PaginatedResult<ActivityLog>>("/activity-logs", {
    params: { page: 1, limit: 1 },
    headers: { "X-Organization-Id": orgId },
  });
  const first = data?.data?.[0];
  return first?.createdAt ?? null;
}

/** Fetch activity logs for an org (for org preview drawer). */
export async function fetchActivityLogsByOrg(
  orgId: string,
  page = 1,
  limit = 20
): Promise<PaginatedResult<ActivityLog>> {
  const { data } = await apiClient.get<PaginatedResult<ActivityLog>>("/activity-logs", {
    params: { page, limit },
    headers: { "X-Organization-Id": orgId },
  });
  return data;
}
