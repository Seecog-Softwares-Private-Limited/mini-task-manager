import type { TaskSubtask } from "@/types/api";
import { isSubtaskOverdue } from "@/lib/subtask-due-date";
import { resolveSubtaskStatus } from "@/lib/subtask-status";

type SortableSubtask = Pick<
  TaskSubtask,
  "title" | "status" | "dueDate" | "dueTime" | "completionRecord" | "createdAt"
> & {
  id?: string;
  completed?: boolean;
  completedAt?: string | null;
  updatedAt?: string | null;
};

/**
 * Checklist display buckets — must match row accent colors:
 * 0. Blue — To Do (open, not overdue)
 * 1. Red — Overdue (any open item past due, including in-progress)
 * 2. Yellow — In Progress (not overdue)
 * 3. Green — Done
 */
function displayBucket(subtask: SortableSubtask): number {
  const status = resolveSubtaskStatus(subtask);
  if (status === "DONE") return 3;
  const overdue = isSubtaskOverdue(subtask.dueDate, {
    dueTime: subtask.dueTime,
    completed: subtask.completed,
    status: subtask.status,
  });
  // Overdue before In Progress so red/yellow groups never interleave.
  if (overdue) return 1;
  if (status === "IN_PROGRESS") return 2;
  return 0;
}

function parseMillis(raw?: string | null): number {
  const value = raw?.trim() ?? "";
  if (!value) return 0;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? 0 : ms;
}

/** Client ids are often `{epochMicros}_{suffix}` — use as recency fallback. */
function idRecencyMillis(id?: string): number {
  if (!id) return 0;
  const head = id.split("_")[0] ?? "";
  const n = Number(head);
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (n > 100000000000000) return Math.floor(n / 1000);
  if (n > 100000000000) return n;
  return 0;
}

function completedAtMillis(subtask: SortableSubtask): number {
  return (
    parseMillis(subtask.completedAt) ||
    parseMillis(subtask.completionRecord?.completedAt) ||
    0
  );
}

/** Prefer updatedAt, then created / completed / id — newest on top. */
function recencyMillis(subtask: SortableSubtask): number {
  const updated = parseMillis(subtask.updatedAt);
  if (updated > 0) return updated;
  const created = parseMillis(subtask.createdAt);
  if (created > 0) return created;
  const completed = completedAtMillis(subtask);
  if (completed > 0) return completed;
  return idRecencyMillis(subtask.id);
}

export function compareSubtasksByDisplayOrder(
  a: SortableSubtask,
  b: SortableSubtask
): number {
  const bucketCmp = displayBucket(a) - displayBucket(b);
  if (bucketCmp !== 0) return bucketCmp;

  const recencyCmp = recencyMillis(b) - recencyMillis(a);
  if (recencyCmp !== 0) return recencyCmp;

  return (a.title ?? "").localeCompare(b.title ?? "");
}

export function sortSubtasksByDisplayOrder<T extends TaskSubtask>(subtasks: T[]): T[] {
  return [...subtasks].sort(compareSubtasksByDisplayOrder);
}
