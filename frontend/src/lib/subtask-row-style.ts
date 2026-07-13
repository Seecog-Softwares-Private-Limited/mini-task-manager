import { isSubtaskOverdue } from "@/lib/subtask-due-date";
import { resolveSubtaskStatus, type SubtaskStatus } from "@/lib/subtask-status";
import { cn } from "@/lib/utils";

export interface SubtaskRowStyleInput {
  status?: SubtaskStatus | string;
  completed?: boolean;
  dueDate?: string;
  dueTime?: string;
  expanded?: boolean;
}

const STATUS_ROW_CLASSES: Record<SubtaskStatus, string> = {
  TODO: "border-red-200/80 bg-red-50/90 dark:border-red-500/30 dark:bg-red-500/10",
  IN_PROGRESS:
    "border-emerald-200/80 bg-emerald-50/90 dark:border-emerald-500/30 dark:bg-emerald-500/10",
  DONE: "border-emerald-200/80 bg-emerald-50/90 dark:border-emerald-500/30 dark:bg-emerald-500/10",
};

const OVERDUE_ROW_CLASSES =
  "border-red-800/70 bg-red-200/55 dark:border-red-700/55 dark:bg-red-950/35";

export function getSubtaskRowClassName(input: SubtaskRowStyleInput): string {
  const overdue = isSubtaskOverdue(input.dueDate, {
    dueTime: input.dueTime,
    completed: input.completed,
    status: input.status,
  });
  const status = resolveSubtaskStatus(input);
  const base = overdue ? OVERDUE_ROW_CLASSES : STATUS_ROW_CLASSES[status];

  return cn(base, input.expanded && "ring-1 ring-primary/15");
}
