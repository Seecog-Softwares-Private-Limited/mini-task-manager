import type { Notification } from "@/types/api";

/** Build an in-app path for a notification deep-link payload. */
export function notificationDeepLinkHref(n: Pick<Notification, "data">): string | null {
  const data = n.data ?? {};
  const taskId = data.taskId?.trim();
  const projectId = data.projectId?.trim();
  const subtaskId = data.subtaskId?.trim();
  if (!taskId || !projectId) return null;
  const params = new URLSearchParams({ task: taskId });
  if (subtaskId) params.set("subtask", subtaskId);
  return `/dashboard/projects/${projectId}/board?${params.toString()}`;
}
