/** Build Tasks page URL, preserving selected project when available. */
export function buildTasksPageHref(projectId?: string | null): string {
  if (!projectId) return "/dashboard/tasks";
  return `/dashboard/tasks?projectId=${encodeURIComponent(projectId)}`;
}
