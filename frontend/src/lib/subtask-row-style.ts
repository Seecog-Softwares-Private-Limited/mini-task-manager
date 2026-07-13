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

/**
 * Kanban-card style: thick left accent + neutral body + subtle gray border.
 * - To Do → light red left bar
 * - In Progress → light yellow left bar
 * - Done → light green left bar
 * - Overdue → dark red left bar
 */
export const SUBTASK_ROW_COLORS = {
  TODO: {
    accentColor: "#F87171", // red-400
  },
  IN_PROGRESS: {
    accentColor: "#EAB308", // yellow-500
  },
  DONE: {
    accentColor: "#34D399", // emerald-400
  },
  OVERDUE: {
    accentColor: "#B91C1C", // red-700
  },
} as const;

export type SubtaskRowTone = keyof typeof SUBTASK_ROW_COLORS;

export function resolveSubtaskRowTone(input: SubtaskRowStyleInput): SubtaskRowTone {
  const overdue = isSubtaskOverdue(input.dueDate, {
    dueTime: input.dueTime,
    completed: input.completed,
    status: input.status,
  });
  if (overdue) return "OVERDUE";
  return resolveSubtaskStatus(input);
}

export function getSubtaskRowStyle(input: SubtaskRowStyleInput): {
  boxShadow: string;
} {
  const tone = resolveSubtaskRowTone(input);
  const { accentColor } = SUBTASK_ROW_COLORS[tone];
  const elevation = input.expanded
    ? ", 0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 12px -4px rgba(15, 23, 42, 0.08)"
    : ", 0 1px 2px rgba(15, 23, 42, 0.03)";

  return {
    // Thick left accent like Kanban task cards
    boxShadow: `inset 4px 0 0 0 ${accentColor}${elevation}`,
  };
}

/** Neutral card chrome; status color is the left accent via getSubtaskRowStyle. */
export function getSubtaskRowClassName(input: SubtaskRowStyleInput): string {
  return cn(
    "border border-border/60 bg-background transition-[box-shadow,border-color] duration-200",
    input.expanded && "ring-1 ring-primary/15 ring-offset-1 ring-offset-background"
  );
}
