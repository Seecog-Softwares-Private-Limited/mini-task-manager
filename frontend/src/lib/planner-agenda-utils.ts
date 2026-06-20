import type { Task, WorkflowStatus } from "@/types/api";
import { getWorkflowStatusCategory } from "@/components/kanban/task-card";
import { isTaskOverdue } from "@/lib/recurring-board-filters";

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

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function isSameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

function isDone(task: Task, statuses: WorkflowStatus[], doneStatusId?: string): boolean {
  if (doneStatusId && task.statusId === doneStatusId) return true;
  const status = statuses.find((s) => s.id === task.statusId);
  return getWorkflowStatusCategory(status) === "done";
}

export type AgendaGroupKey = "missed" | "today" | "tomorrow" | "this_week" | "completed";

export interface AgendaGroup {
  key: AgendaGroupKey;
  label: string;
  hint: string;
  tasks: Task[];
}

export function groupTasksForAgenda(
  tasks: Task[],
  statuses: WorkflowStatus[],
  overdueTaskIds: string[],
  doneStatusId?: string
): AgendaGroup[] {
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const weekEnd = addDays(today, 7);

  const missed: Task[] = [];
  const todayList: Task[] = [];
  const tomorrowList: Task[] = [];
  const weekList: Task[] = [];
  const completed: Task[] = [];

  for (const task of tasks) {
    if (isDone(task, statuses, doneStatusId)) {
      completed.push(task);
      continue;
    }

    if (overdueTaskIds.includes(task.id) || isTaskOverdue(task, overdueTaskIds)) {
      missed.push(task);
      continue;
    }

    const due = parseDateOnly(task.dueDate);
    if (!due) {
      weekList.push(task);
      continue;
    }

    const dueDay = startOfDay(due);
    if (isSameDay(dueDay, today)) todayList.push(task);
    else if (isSameDay(dueDay, tomorrow)) tomorrowList.push(task);
    else if (dueDay > tomorrow && dueDay <= weekEnd) weekList.push(task);
    else if (dueDay < today) missed.push(task);
    else weekList.push(task);
  }

  const groups: AgendaGroup[] = [
    {
      key: "missed",
      label: "Missed",
      hint: "Needs catch-up",
      tasks: missed,
    },
    {
      key: "today",
      label: "Today",
      hint: "On your desk now",
      tasks: todayList,
    },
    {
      key: "tomorrow",
      label: "Tomorrow",
      hint: "Up next",
      tasks: tomorrowList,
    },
    {
      key: "this_week",
      label: "This Week",
      hint: "Scheduled ahead",
      tasks: weekList,
    },
    {
      key: "completed",
      label: "Completed",
      hint: "Recently finished",
      tasks: completed,
    },
  ];

  return groups.filter((g) => g.tasks.length > 0);
}

export function getPlannerGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function computePlannerStreak(
  tasks: Task[],
  doneStatusId?: string
): number {
  let streak = 0;
  const today = startOfDay(new Date());
  for (let i = 0; i < 14; i++) {
    const day = addDays(today, -i);
    const dayEnd = addDays(day, 1);
    const hasCompletion = tasks.some((t) => {
      if (doneStatusId && t.statusId !== doneStatusId) return false;
      const updated = new Date(t.updatedAt);
      return updated >= day && updated < dayEnd;
    });
    if (hasCompletion) streak++;
    else if (i > 0) break;
  }
  return streak;
}
