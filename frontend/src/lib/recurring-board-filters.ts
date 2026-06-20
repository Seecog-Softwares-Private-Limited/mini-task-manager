import type { BoardFilters } from "@/components/kanban/kanban-board";
import type { Task, WorkflowStatus } from "@/types/api";
import { isDueToday } from "@/lib/recurring-board-utils";
import { getWorkflowStatusCategory } from "@/components/kanban/task-card";

export type RecurrenceTypeFilter = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY" | "CUSTOM";

export interface RecurringBoardFilters extends BoardFilters {
  statusIds: string[];
  recurrenceTypes: RecurrenceTypeFilter[];
  missedOnly: boolean;
  dueTodayOnly: boolean;
  overdueOnly: boolean;
  assignedToMe: boolean;
  pausedSeriesOnly: boolean;
}

export const DEFAULT_RECURRING_BOARD_FILTERS: RecurringBoardFilters = {
  search: "",
  priority: [],
  assignee: [],
  statusIds: [],
  recurrence: "recurring",
  sortBy: "dueDate",
  sortDir: "asc",
  recurrenceTypes: [],
  missedOnly: false,
  dueTodayOnly: false,
  overdueOnly: false,
  assignedToMe: false,
  pausedSeriesOnly: false,
};

function parseDateOnly(value?: string): Date | null {
  if (!value) return null;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function isTaskOverdue(task: Task, overdueTaskIds: string[]): boolean {
  if (overdueTaskIds.includes(task.id)) return true;
  const due = parseDateOnly(task.dueDate);
  if (!due) return false;
  return startOfDay(due).getTime() < startOfDay(new Date()).getTime();
}

export function isTaskMissed(task: Task, overdueTaskIds: string[]): boolean {
  return isTaskOverdue(task, overdueTaskIds);
}

import type { RecurringTemplateSummary } from "@/types/api";

export function applyRecurringBoardFilters(
  tasks: Task[],
  filters: RecurringBoardFilters,
  currentUserId: string | null,
  overdueTaskIds: string[],
  templates: RecurringTemplateSummary[] = []
): Task[] {
  let result = [...tasks];

  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q)
    );
  }

  if (filters.priority.length > 0) {
    result = result.filter((t) => filters.priority.includes(t.priority));
  }

  if (filters.assignee.length > 0) {
    result = result.filter((t) => {
      const ids = t.assigneeIds?.length ? t.assigneeIds : t.assigneeId ? [t.assigneeId] : [];
      return ids.some((id) => filters.assignee.includes(id));
    });
  }

  if (filters.statusIds.length > 0) {
    result = result.filter((t) => t.statusId && filters.statusIds.includes(t.statusId));
  }

  if (filters.recurrenceTypes.length > 0) {
    result = result.filter((t) => {
      const type = (t.recurrenceType ?? "CUSTOM").toUpperCase() as RecurrenceTypeFilter;
      return filters.recurrenceTypes.includes(type);
    });
  }

  if (filters.assignedToMe && currentUserId) {
    result = result.filter((t) => {
      const ids = t.assigneeIds?.length ? t.assigneeIds : t.assigneeId ? [t.assigneeId] : [];
      return ids.includes(currentUserId);
    });
  }

  if (filters.dueTodayOnly) {
    result = result.filter((t) => isDueToday(t.dueDate));
  }

  if (filters.overdueOnly) {
    result = result.filter((t) => isTaskOverdue(t, overdueTaskIds));
  }

  if (filters.missedOnly) {
    result = result.filter((t) => isTaskMissed(t, overdueTaskIds));
  }

  if (filters.pausedSeriesOnly) {
    const pausedIds = new Set(templates.filter((t) => t.isPaused).map((t) => t.id));
    result = result.filter(
      (t) => t.recurringTemplateId && pausedIds.has(t.recurringTemplateId)
    );
  }

  const priorityOrder: Record<string, number> = {
    CRITICAL: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
  };

  result.sort((a, b) => {
    let cmp = 0;
    switch (filters.sortBy) {
      case "priority":
        cmp =
          (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9);
        break;
      case "dueDate": {
        const ad = parseDateOnly(a.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const bd = parseDateOnly(b.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        cmp = ad - bd;
        break;
      }
      case "title":
        cmp = a.title.localeCompare(b.title);
        break;
      case "created":
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      default:
        cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
    }
    return filters.sortDir === "desc" ? -cmp : cmp;
  });

  return result;
}

export type RecurringOccurrenceStatus =
  | "overdue"
  | "missed"
  | "todo"
  | "in_progress"
  | "done";

export function getRecurringOccurrenceStatus(
  task: Task,
  overdueTaskIds: string[],
  statuses: WorkflowStatus[]
): RecurringOccurrenceStatus {
  if (overdueTaskIds.includes(task.id)) return "missed";
  const status = statuses.find((s) => s.id === task.statusId);
  const cat = getWorkflowStatusCategory(status);
  if (cat === "done") return "done";
  if (cat === "in_progress") return "in_progress";
  if (isTaskOverdue(task, overdueTaskIds)) return "overdue";
  return "todo";
}

export const OCCURRENCE_STATUS_STYLES: Record<
  RecurringOccurrenceStatus,
  { bg: string; text: string; border: string; dot: string; label: string }
> = {
  missed: {
    bg: "bg-rose-500/12",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-400/30",
    dot: "bg-rose-500",
    label: "Missed",
  },
  overdue: {
    bg: "bg-orange-500/12",
    text: "text-orange-700 dark:text-orange-300",
    border: "border-orange-400/30",
    dot: "bg-orange-500",
    label: "Overdue",
  },
  todo: {
    bg: "bg-sky-500/10",
    text: "text-sky-700 dark:text-sky-300",
    border: "border-sky-400/25",
    dot: "bg-sky-500",
    label: "To do",
  },
  in_progress: {
    bg: "bg-amber-500/12",
    text: "text-amber-800 dark:text-amber-300",
    border: "border-amber-400/30",
    dot: "bg-amber-500",
    label: "In progress",
  },
  done: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-400/25",
    dot: "bg-emerald-500",
    label: "Done",
  },
};
