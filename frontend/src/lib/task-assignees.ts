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

export interface ResolvedTaskAssignee {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  lastSeenAt?: string;
}

type AssignableMember = {
  userId: string;
  user?: {
    fullName?: string;
    email?: string;
    avatarUrl?: string;
    lastSeenAt?: string;
  };
};

/** Resolve display profiles for all assignees on a task. */
export function resolveTaskAssignees(
  task: TaskAssigneeSource,
  members: AssignableMember[]
): ResolvedTaskAssignee[] {
  const rawIds = task.assigneeIds?.length
    ? task.assigneeIds
    : task.assigneeId
      ? [task.assigneeId]
      : [];
  const seen = new Set<string>();
  const resolved: ResolvedTaskAssignee[] = [];

  for (const rawId of rawIds) {
    const key = normalizeAssigneeUserId(rawId);
    if (!key || seen.has(key)) continue;
    seen.add(key);

    const member = members.find((m) => normalizeAssigneeUserId(m.userId) === key);
    if (member?.user) {
      resolved.push({
        id: member.userId,
        name: member.user.fullName ?? member.user.email ?? "User",
        email: member.user.email,
        avatarUrl: member.user.avatarUrl,
        lastSeenAt: member.user.lastSeenAt,
      });
      continue;
    }

    if (task.assignee && normalizeAssigneeUserId(task.assignee.id) === key) {
      const isActive = members.some(
        (m) => normalizeAssigneeUserId(m.userId) === key,
      );
      if (isActive) {
        resolved.push({
          id: task.assignee.id,
          name: task.assignee.fullName ?? task.assignee.email ?? "User",
          email: task.assignee.email,
          avatarUrl: task.assignee.avatarUrl,
        });
      }
      continue;
    }

    // Skip assignees who are no longer active workspace/project members.
  }

  return resolved;
}

export function getTaskAssigneeIdList(task: TaskAssigneeSource): string[] {
  if (task.assigneeIds?.length) return task.assigneeIds;
  if (task.assigneeId) return [task.assigneeId];
  return [];
}

/** True when every ID in `filteredIds` is already in `selectedIds`. */
export function areAllFilteredAssigneesSelected(
  selectedIds: Iterable<string>,
  filteredIds: string[],
): boolean {
  if (filteredIds.length === 0) return false;
  const selected = new Set(
    Array.from(selectedIds).map((id) => normalizeAssigneeUserId(id)),
  );
  return filteredIds.every((id) => selected.has(normalizeAssigneeUserId(id)));
}

/** Select or deselect every member in `filteredIds` (search-aware). */
export function toggleSelectAllFilteredAssignees(
  currentIds: string[],
  filteredIds: string[],
): string[] {
  if (filteredIds.length === 0) return currentIds;
  if (areAllFilteredAssigneesSelected(currentIds, filteredIds)) {
    const filteredNorm = new Set(filteredIds.map((id) => normalizeAssigneeUserId(id)));
    return currentIds.filter((id) => !filteredNorm.has(normalizeAssigneeUserId(id)));
  }
  const merged = new Map<string, string>();
  for (const id of currentIds) merged.set(normalizeAssigneeUserId(id), id);
  for (const id of filteredIds) merged.set(normalizeAssigneeUserId(id), id);
  return Array.from(merged.values());
}

export function canUserMoveTask(
  task: TaskAssigneeSource,
  userId: string | null | undefined,
  canMoveAllTasks: boolean
): boolean {
  if (canMoveAllTasks) return true;
  return isUserAssignedToTask(task, userId);
}

type TaskReporterSource = TaskAssigneeSource & { reporterId?: string };

/** True when the user created the task (shown as "Assigned by" in the UI). */
export function isUserTaskReporter(
  task: TaskReporterSource,
  userId: string | null | undefined
): boolean {
  const uid = normalizeAssigneeUserId(userId);
  if (!uid) return false;
  return uid === normalizeAssigneeUserId(task.reporterId);
}

export function canUserDeleteTask(
  task: TaskReporterSource,
  userId: string | null | undefined,
  canDeleteAllTasks: boolean
): boolean {
  if (canDeleteAllTasks) return true;
  return isUserTaskReporter(task, userId);
}

/** Full edit when owner/admin, or when assigned-by user is also assigned to the task. */
export function canUserEditTaskFully(
  task: TaskReporterSource,
  userId: string | null | undefined,
  canEditAllTasks: boolean
): boolean {
  if (canEditAllTasks) return true;
  return isUserTaskReporter(task, userId) && isUserAssignedToTask(task, userId);
}
