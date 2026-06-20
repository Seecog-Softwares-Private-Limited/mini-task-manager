import type { WorkflowStatus, Task } from "@/types/api";

/** Virtual kanban column for overdue recurring occurrences. */
export const RECURRING_OVERDUE_COLUMN_ID = "__recurring_overdue__";

export function buildRecurringOverdueStatus(): WorkflowStatus {
  return {
    id: RECURRING_OVERDUE_COLUMN_ID,
    name: "Overdue",
    type: "TODO",
    position: -1,
    color: "#f97316",
    workflowId: "",
  };
}

export function isRecurringOverdueColumn(statusId: string): boolean {
  return statusId === RECURRING_OVERDUE_COLUMN_ID;
}

export function partitionRecurringBoardTasks(
  tasks: Task[],
  overdueTaskIds: string[],
  statuses: WorkflowStatus[]
): Record<string, Task[]> {
  const overdueSet = new Set(overdueTaskIds);
  const statusIds = new Set(statuses.map((s) => s.id));
  const map: Record<string, Task[]> = {};

  for (const s of statuses) {
    map[s.id] = [];
  }
  if (overdueSet.size > 0) {
    map[RECURRING_OVERDUE_COLUMN_ID] = [];
  }

  for (const task of tasks) {
    const isDone = statuses.some(
      (s) => s.id === task.statusId && (s.type === "DONE" || s.name.toLowerCase() === "done")
    );
    if (overdueSet.has(task.id) && !isDone) {
      map[RECURRING_OVERDUE_COLUMN_ID]?.push(task);
      continue;
    }
    let key = task.statusId ?? statuses[0]?.id ?? "none";
    if (!statusIds.has(key) && statuses[0]) {
      key = statuses[0].id;
    }
    if (!map[key]) map[key] = [];
    map[key].push(task);
  }

  return map;
}

export function cadenceAccentClass(recurrenceType?: string | null): string {
  switch (recurrenceType?.toUpperCase()) {
    case "DAILY":
      return "border-l-sky-500";
    case "WEEKLY":
      return "border-l-violet-500";
    case "MONTHLY":
      return "border-l-amber-500";
    case "YEARLY":
      return "border-l-rose-500";
    default:
      return "border-l-indigo-400";
  }
}

export function cadenceBarClass(recurrenceType?: string | null): string {
  switch (recurrenceType?.toUpperCase()) {
    case "DAILY":
      return "bg-sky-500/75";
    case "WEEKLY":
      return "bg-violet-500/75";
    case "MONTHLY":
      return "bg-amber-500/75";
    case "YEARLY":
      return "bg-rose-500/75";
    default:
      return "bg-indigo-400/75";
  }
}
