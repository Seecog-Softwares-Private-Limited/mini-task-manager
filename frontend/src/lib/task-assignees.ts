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
      resolved.push({
        id: task.assignee.id,
        name: task.assignee.fullName ?? task.assignee.email ?? "User",
        email: task.assignee.email,
        avatarUrl: task.assignee.avatarUrl,
      });
      continue;
    }

    resolved.push({ id: rawId, name: "User" });
  }

  return resolved;
}

export function getTaskAssigneeIdList(task: TaskAssigneeSource): string[] {
  if (task.assigneeIds?.length) return task.assigneeIds;
  if (task.assigneeId) return [task.assigneeId];
  return [];
}

export function canUserMoveTask(
  task: TaskAssigneeSource,
  userId: string | null | undefined,
  canMoveAllTasks: boolean
): boolean {
  if (canMoveAllTasks) return true;
  return isUserAssignedToTask(task, userId);
}
