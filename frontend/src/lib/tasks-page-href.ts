/** Build Tasks page URL, preserving selected project when available. */
export function buildTasksPageHref(projectId?: string | null): string {
  if (!projectId) return "/dashboard/tasks";
  return `/dashboard/tasks?projectId=${encodeURIComponent(projectId)}`;
}

/** Build Recurring Tasks page URL, preserving selected project when available. */
export function buildRecurringTasksPageHref(projectId?: string | null): string {
  if (!projectId) return "/dashboard/recurring-tasks";
  return `/dashboard/recurring-tasks?projectId=${encodeURIComponent(projectId)}`;
}
