import type { TaskSubtask } from "@/types/api";
import { resolveSubtaskStatus } from "@/lib/subtask-status";

const PRIORITY_ORDER: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

/**
 * Checklist display order (matches board urgency):
 * 1. Critical (open)
 * 2. In Progress (open, non-critical)
 * 3. Other open subtasks (by priority)
 * 4. Done at the bottom
 */
export function compareSubtasksByDisplayOrder(
  a: Pick<TaskSubtask, "title" | "priority" | "status" | "dueDate"> & {
    completed?: boolean;
  },
  b: Pick<TaskSubtask, "title" | "priority" | "status" | "dueDate"> & {
    completed?: boolean;
  }
): number {
  const aStatus = resolveSubtaskStatus(a);
  const bStatus = resolveSubtaskStatus(b);
  const aDone = aStatus === "DONE";
  const bDone = bStatus === "DONE";
  if (aDone !== bDone) return aDone ? 1 : -1;

  const aCrit = (a.priority ?? "").toUpperCase() === "CRITICAL";
  const bCrit = (b.priority ?? "").toUpperCase() === "CRITICAL";
  if (aCrit !== bCrit) return aCrit ? -1 : 1;

  const aProg = aStatus === "IN_PROGRESS";
  const bProg = bStatus === "IN_PROGRESS";
  if (aProg !== bProg) return aProg ? -1 : 1;

  const pa = PRIORITY_ORDER[(a.priority ?? "").toUpperCase()] ?? 99;
  const pb = PRIORITY_ORDER[(b.priority ?? "").toUpperCase()] ?? 99;
  if (pa !== pb) return pa - pb;

  const dueCmp = (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999");
  if (dueCmp !== 0) return dueCmp;

  return (a.title ?? "").localeCompare(b.title ?? "");
}

export function sortSubtasksByDisplayOrder<T extends TaskSubtask>(subtasks: T[]): T[] {
  return [...subtasks].sort(compareSubtasksByDisplayOrder);
}
