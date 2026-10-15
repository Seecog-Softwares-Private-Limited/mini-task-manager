import type { TaskSubtask } from "@/types/api";
import { isSubtaskOverdue } from "@/lib/subtask-due-date";
import { resolveSubtaskStatus } from "@/lib/subtask-status";

type SortableSubtask = Pick<
  TaskSubtask,
  "title" | "status" | "dueDate" | "dueTime" | "completionRecord"
> & {
  completed?: boolean;
  completedAt?: string | null;
};

function hasDueAssigned(subtask: SortableSubtask): boolean {
  const date = subtask.dueDate?.trim() ?? "";
  const time = subtask.dueTime?.trim() ?? "";
  return date.length > 0 || time.length > 0;
}

/**
 * Checklist display buckets:
 * 1. No date/time assigned (open)
 * 2. Due today and still completable (not overdue); future remaining after today via due key
 * 3. Overdue (open)
 * 4. In Progress
 * 5. Completed (most recently marked done first)
 */
function displayBucket(subtask: SortableSubtask): number {
  const status = resolveSubtaskStatus(subtask);
  if (status === "DONE") return 4;
  if (status === "IN_PROGRESS") return 3;
  if (!hasDueAssigned(subtask)) return 0;
  if (
    isSubtaskOverdue(subtask.dueDate, {
      dueTime: subtask.dueTime,
      completed: subtask.completed,
      status: subtask.status,
    })
  ) {
    return 2;
  }
  return 1;
}

function dueSortKey(subtask: SortableSubtask): string {
  const date = subtask.dueDate?.trim() ?? "";
  const time = subtask.dueTime?.trim() ?? "";
  if (!date && !time) return "9999";
  if (!date) return `0000-00-00T${time}`;
  if (!time) return date;
  return `${date}T${time}`;
}

function completedAtMillis(subtask: SortableSubtask): number {
  const raw =
    subtask.completedAt?.trim() ||
    subtask.completionRecord?.completedAt?.trim() ||
    "";
  if (!raw) return 0;
  const ms = Date.parse(raw);
  return Number.isNaN(ms) ? 0 : ms;
}

export function compareSubtasksByDisplayOrder(
  a: SortableSubtask,
  b: SortableSubtask
): number {
  const bucketCmp = displayBucket(a) - displayBucket(b);
  if (bucketCmp !== 0) return bucketCmp;

  // Within done: newest completion on top.
  if (displayBucket(a) === 4) {
    const doneCmp = completedAtMillis(b) - completedAtMillis(a);
    if (doneCmp !== 0) return doneCmp;
    return (a.title ?? "").localeCompare(b.title ?? "");
  }

  const dueCmp = dueSortKey(a).localeCompare(dueSortKey(b));
  if (dueCmp !== 0) return dueCmp;

  return (a.title ?? "").localeCompare(b.title ?? "");
}

export function sortSubtasksByDisplayOrder<T extends TaskSubtask>(subtasks: T[]): T[] {
  return [...subtasks].sort(compareSubtasksByDisplayOrder);
}
