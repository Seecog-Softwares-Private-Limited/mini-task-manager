import type { Task } from "@/types/api";

/** Normalize user IDs for reliable assignee comparisons. */
export function normalizeAssigneeUserId(id: string | null | undefined): string {
  return String(id ?? "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "");
}

type TaskAssigneeSource = Pick<Task, "assigneeId" | "assigneeIds" | "assignee"> & {
  assignees?: Array<{ id?: string }>;
};

/** All user IDs assigned to a task (multi-assignee list + legacy single assignee). */
export function getTaskAssigneeUserIds(task: TaskAssigneeSource): string[] {
  const ids = new Set<string>();
  const add = (id: string | null | undefined) => {
    const normalized = normalizeAssigneeUserId(id);
    if (normalized) ids.add(normalized);
  };

  for (const id of task.assigneeIds ?? []) add(id);
  add(task.assigneeId);
  add(task.assignee?.id);
  for (const assignee of task.assignees ?? []) add(assignee.id);

  return Array.from(ids);
}

export function isUserAssignedToTask(
  task: TaskAssigneeSource,
  userId: string | null | undefined
): boolean {
  const uid = normalizeAssigneeUserId(userId);
  if (!uid) return false;
  return getTaskAssigneeUserIds(task).includes(uid);
}

export function canUserMoveTask(
  task: TaskAssigneeSource,
  userId: string | null | undefined,
  canMoveAllTasks: boolean
): boolean {
  if (canMoveAllTasks) return true;
  return isUserAssignedToTask(task, userId);
}
