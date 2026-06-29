import { normalizeAssigneeUserId } from "@/lib/task-assignees";

type SubtaskAssigneeSource = {
  assigneeId?: string;
  assigneeIds?: string[];
};

/** All user IDs assigned to a subtask (multi-assignee list + legacy single assignee). */
export function getSubtaskAssigneeIds(subtask: SubtaskAssigneeSource): string[] {
  const ids = new Map<string, string>();
  const add = (id: string | null | undefined) => {
    const raw = String(id ?? "").trim();
    const key = normalizeAssigneeUserId(raw);
    if (key) ids.set(key, raw);
  };

  for (const id of subtask.assigneeIds ?? []) add(id);
  add(subtask.assigneeId);

  return Array.from(ids.values());
}

export function withSubtaskAssignees<T extends object>(
  subtask: T,
  assigneeIds: string[],
): T {
  const unique = new Map<string, string>();
  for (const id of assigneeIds) {
    const raw = String(id ?? "").trim();
    const key = normalizeAssigneeUserId(raw);
    if (key) unique.set(key, raw);
  }
  const nextIds = Array.from(unique.values());
  const next = { ...subtask } as T & SubtaskAssigneeSource;

  if (nextIds.length) {
    next.assigneeIds = nextIds;
    next.assigneeId = nextIds[0];
  } else {
    delete next.assigneeIds;
    delete next.assigneeId;
  }

  return next as T;
}

export function subtaskAssigneesEqual(
  a: SubtaskAssigneeSource,
  b: SubtaskAssigneeSource,
): boolean {
  const aIds = getSubtaskAssigneeIds(a).map(normalizeAssigneeUserId).sort();
  const bIds = getSubtaskAssigneeIds(b).map(normalizeAssigneeUserId).sort();
  if (aIds.length !== bIds.length) return false;
  return aIds.every((id, index) => id === bIds[index]);
}
