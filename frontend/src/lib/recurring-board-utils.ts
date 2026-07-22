import type { RecurringTaskSummary, RecurringTemplateSummary, Task, WorkflowStatus } from "@/types/api";
import { getWorkflowStatusCategory } from "@/components/kanban/task-card";
import { toRecurrenceLabel } from "@/lib/recurrence-display";

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

export function formatShortDate(value?: string): string {
  const d = parseDateOnly(value);
  if (!d) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function isDueToday(value?: string): boolean {
  const d = parseDateOnly(value);
  if (!d) return false;
  const today = startOfDay(new Date());
  return startOfDay(d).getTime() === today.getTime();
}

export function countDueToday(tasks: Task[]): number {
  return tasks.filter((t) => isDueToday(t.dueDate)).length;
}

export function countCompletedThisWeek(tasks: Task[], doneStatusId?: string): number {
  const weekStart = startOfDay(new Date());
  weekStart.setDate(weekStart.getDate() - 6);
  return tasks.filter((t) => {
    const isDone =
      (doneStatusId && t.statusId === doneStatusId) ||
      false;
    if (!isDone) return false;
    const updated = new Date(t.updatedAt);
    return updated >= weekStart;
  }).length;
}

export function formatRecurringScheduleLine(
  task: Task,
  template?: RecurringTemplateSummary
): string | null {
  const due = formatShortDate(task.dueDate);
  const timeMatch =
    typeof task.dueTime === "string"
      ? task.dueTime.trim().match(/^([01]\d|2[0-3]):([0-5]\d)/)
      : null;
  const dueWithTime = due && timeMatch ? `${due} · ${timeMatch[0]}` : due;
  const next = formatShortDate(template?.nextDueDate);
  if (dueWithTime && next && due !== next) return `Due ${dueWithTime} · Next ${next}`;
  if (dueWithTime) return `Due ${dueWithTime}`;
  if (next) return `Next ${next}`;
  return null;
}

export function getRecurringMissedTone(
  task: Task,
  columnStatus?: WorkflowStatus
): "critical" | "warning" | null {
  const cat = getWorkflowStatusCategory(columnStatus);
  if (cat === "done") return null;
  const due = parseDateOnly(task.dueDate);
  if (!due) return null;
  const today = startOfDay(new Date());
  if (startOfDay(due).getTime() >= today.getTime()) return null;
  const daysPast = Math.floor((today.getTime() - startOfDay(due).getTime()) / 86400000);
  return daysPast >= 3 ? "critical" : "warning";
}

export function getRecurringEmptyColumnMessage(status: WorkflowStatus): string {
  if (status.id === "__recurring_overdue__") return "No overdue occurrences — great job!";
  const cat = getWorkflowStatusCategory(status);
  if (cat === "in_progress") return "No active occurrences";
  if (cat === "done") return "No completed occurrences yet";
  return "No scheduled occurrences";
}

export function getRecurringColumnHint(
  status: WorkflowStatus,
  tasks: Task[]
): string | null {
  if (status.id === "__recurring_overdue__") {
    return tasks.length > 0 ? `${tasks.length} overdue` : null;
  }
  const cat = getWorkflowStatusCategory(status);
  const now = Date.now();
  if (cat === "done") {
    return tasks.length > 0 ? `${tasks.length} completed` : "0 completed";
  }
  if (cat === "in_progress") {
    return tasks.length > 0 ? `${tasks.length} active` : "0 active";
  }
  const overdue = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate).getTime() < now
  ).length;
  if (overdue > 0) return `${overdue} overdue`;
  if (cat === "todo" && tasks.length > 0) return `${tasks.length} scheduled`;
  return null;
}

export interface RecurringHealthMetrics {
  completionRate: number;
  missedOccurrences: number;
  pausedSeries: number;
  mostDelayedTitle: string | null;
  mostDelayedDays: number;
}

export interface ExecutiveHealthMetrics extends RecurringHealthMetrics {
  onTimeRate: number;
  healthStatus: "healthy" | "at_risk" | "critical";
  completedThisWeek: number;
}

export function computeExecutiveHealth(
  summary: RecurringTaskSummary | undefined,
  tasks: Task[],
  templates: RecurringTemplateSummary[],
  completedPercent: number,
  doneStatusId?: string
): ExecutiveHealthMetrics {
  const base = computeRecurringHealth(summary, tasks, templates, completedPercent);
  const completedWeek = countCompletedThisWeek(tasks, doneStatusId);
  const missed = base.missedOccurrences;
  const denom = completedWeek + missed;
  const onTimeRate = denom > 0 ? Math.round((completedWeek / denom) * 100) : completedPercent;

  let healthStatus: ExecutiveHealthMetrics["healthStatus"] = "healthy";
  if (missed >= 5 || completedPercent < 35) healthStatus = "critical";
  else if (missed >= 2 || completedPercent < 65) healthStatus = "at_risk";

  return {
    ...base,
    onTimeRate,
    healthStatus,
    completedThisWeek: completedWeek,
  };
}

export function computeRecurringHealth(
  summary: RecurringTaskSummary | undefined,
  tasks: Task[],
  templates: RecurringTemplateSummary[],
  completedPercent: number
): RecurringHealthMetrics {
  let mostDelayedTitle: string | null = null;
  let mostDelayedDays = 0;
  const today = startOfDay(new Date());

  for (const task of tasks) {
    const due = parseDateOnly(task.dueDate);
    if (!due || startOfDay(due).getTime() >= today.getTime()) continue;
    const days = Math.floor((today.getTime() - startOfDay(due).getTime()) / 86400000);
    if (days > mostDelayedDays) {
      mostDelayedDays = days;
      mostDelayedTitle = task.title;
    }
  }

  return {
    completionRate: completedPercent,
    missedOccurrences: summary?.overdue ?? 0,
    pausedSeries: summary?.paused ?? templates.filter((t) => t.isPaused).length,
    mostDelayedTitle,
    mostDelayedDays,
  };
}

/** Count of series in the ACTIVE state (excludes paused and archived). */
export function activeSeriesCount(
  summary: RecurringTaskSummary | undefined,
  templates: RecurringTemplateSummary[]
): number {
  if (templates.length > 0) {
    return templates.filter((t) =>
      t.status ? t.status === "ACTIVE" : !t.isPaused
    ).length;
  }
  if (summary) return Math.max(0, summary.totalRecurringTasks - summary.paused);
  return 0;
}

/** Aggregate run totals across the project's series (workspace+project scoped). */
export function aggregateRunHealth(templates: RecurringTemplateSummary[]): {
  totalGenerated: number;
  totalCompleted: number;
  totalMissed: number;
  healthPercent: number;
  hasData: boolean;
} {
  let totalGenerated = 0;
  let totalCompleted = 0;
  let totalMissed = 0;
  for (const t of templates) {
    totalGenerated += t.generatedCount ?? 0;
    totalCompleted += t.completed ?? 0;
    totalMissed += t.missed ?? 0;
  }
  const hasData = totalGenerated > 0;
  return {
    totalGenerated,
    totalCompleted,
    totalMissed,
    healthPercent: hasData ? Math.round((totalCompleted / totalGenerated) * 100) : 0,
    hasData,
  };
}

export function recurrenceBadgeLabel(
  task: Task,
  templates?: RecurringTemplateSummary[],
): string | null {
  if (!task.recurrenceType || task.recurrenceType === "NONE") return null;
  const freq = toRecurrenceLabel(task.recurrenceType);
  const run =
    typeof task.recurrenceSequence === "number" && task.recurrenceSequence > 0
      ? ` · Run #${task.recurrenceSequence}`
      : "";
  const seriesSuffix = getRecurringSeriesSuffix(task, templates);
  return `${freq}${run}${seriesSuffix}`;
}

/** When multiple recurring series share a title, disambiguate in the UI. */
export function getRecurringSeriesSuffix(
  task: Task,
  templates?: RecurringTemplateSummary[],
): string {
  if (!task.recurringTemplateId || !templates?.length) return "";
  const template = templates.find((t) => t.id === task.recurringTemplateId);
  if (!template) return "";
  const sameTitle = templates.filter(
    (t) => t.title.trim().toLowerCase() === template.title.trim().toLowerCase()
  );
  if (sameTitle.length <= 1) return "";
  const index = sameTitle.findIndex((t) => t.id === template.id);
  return index >= 0 ? ` · Series ${index + 1}` : "";
}

/** Keep one board card per recurring template + run number (drops orphan duplicates). */
export function dedupeRecurringBoardTasks(tasks: Task[]): Task[] {
  const byKey = new Map<string, Task>();
  for (const task of tasks) {
    const key = task.recurringTemplateId
      ? `${task.recurringTemplateId}:${task.recurrenceSequence ?? 0}`
      : task.id;
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, task);
      continue;
    }
    const prevTime = new Date(prev.updatedAt).getTime();
    const taskTime = new Date(task.updatedAt).getTime();
    if (taskTime >= prevTime) {
      byKey.set(key, task);
    }
  }
  return Array.from(byKey.values());
}

/** Prefer overdue, then soonest incomplete run — used to open Edit recurring task. */
export function pickBestOccurrence(
  tasks: Task[],
  overdueTaskIds: string[] = [],
  doneStatusIds: Set<string> = new Set()
): Task | null {
  if (!tasks.length) return null;
  const overdueSet = new Set(overdueTaskIds);
  const byDue = (a: Task, b: Task) =>
    String(a.dueDate ?? "").localeCompare(String(b.dueDate ?? ""));
  const incomplete = tasks.filter((t) => !doneStatusIds.has(t.statusId ?? ""));
  const pool = incomplete.length ? incomplete : tasks;
  const overdue = pool.filter((t) => overdueSet.has(t.id));
  if (overdue.length) return [...overdue].sort(byDue)[0] ?? null;
  return [...pool].sort(byDue)[0] ?? null;
}
