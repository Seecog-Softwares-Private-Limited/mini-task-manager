import type { TaskRecurrenceConfig, Task } from "@/types/api";

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function pluralize(word: string, count: number) {
  return count === 1 ? word : `${word}s`;
}

export function toRecurrenceLabel(repeat?: TaskRecurrenceConfig["repeat"] | Task["recurrenceType"]) {
  if (!repeat || repeat === "NONE") return "Normal task";
  const lower = repeat.toLowerCase();
  return `${lower[0].toUpperCase()}${lower.slice(1)}`;
}

export function isRecurringTask(
  task: Pick<Task, "recurrenceType" | "recurringTemplateId">
): boolean {
  if (task.recurringTemplateId) return true;
  return !!task.recurrenceType && task.recurrenceType !== "NONE";
}

/** Compact ribbon label for board cards, e.g. "Daily #1". */
export function recurrenceRibbonLabel(
  task: Pick<Task, "recurrenceType" | "recurrenceSequence">
): string | null {
  if (!isRecurringTask(task)) return null;
  const cadence = toRecurrenceLabel(task.recurrenceType);
  const seq =
    typeof task.recurrenceSequence === "number" && task.recurrenceSequence > 0
      ? ` #${task.recurrenceSequence}`
      : "";
  return `${cadence}${seq}`;
}

/** Short cadence line when full recurrence config is unavailable on the task. */
export function recurrenceCadenceShort(recurrenceType?: Task["recurrenceType"]): string | null {
  if (!recurrenceType || recurrenceType === "NONE") return null;
  switch (recurrenceType) {
    case "DAILY":
      return "Repeats daily";
    case "WEEKLY":
      return "Repeats weekly";
    case "MONTHLY":
      return "Repeats monthly";
    case "YEARLY":
      return "Repeats yearly";
    case "CUSTOM":
      return "Repeats on custom schedule";
    default:
      return "Recurring series";
  }
}

/** Table / list type column value. */
export function recurrenceTypeColumnLabel(
  task: Pick<Task, "recurrenceType" | "recurrenceSequence">
): string {
  if (!isRecurringTask(task)) return "One-time";
  const cadence = toRecurrenceLabel(task.recurrenceType);
  const seq =
    typeof task.recurrenceSequence === "number" && task.recurrenceSequence > 0
      ? ` #${task.recurrenceSequence}`
      : "";
  return `Recurring · ${cadence}${seq}`;
}

export function partitionBoardTasks<T extends Pick<Task, "recurrenceType">>(tasks: T[]) {
  const recurring: T[] = [];
  const oneTime: T[] = [];
  for (const task of tasks) {
    if (isRecurringTask(task)) recurring.push(task);
    else oneTime.push(task);
  }
  return { recurring, oneTime };
}

function recurrenceCadence(config: TaskRecurrenceConfig): string {
  const interval = Math.max(1, Number(config.interval ?? 1));
  if (config.repeat === "DAILY") return `Every ${interval} ${pluralize("day", interval)}`;
  if (config.repeat === "WEEKLY") {
    const days = (config.weeklyDays ?? [])
      .filter((day) => day >= 0 && day <= 6)
      .map((day) => WEEKDAY_SHORT[day]);
    const weeklyBase = `Every ${interval} ${pluralize("week", interval)}`;
    return days.length > 0 ? `${weeklyBase} on ${days.join(", ")}` : weeklyBase;
  }
  if (config.repeat === "MONTHLY") {
    const monthlyBase = `Every ${interval} ${pluralize("month", interval)}`;
    if (config.monthlyMode === "LAST_DAY") return `${monthlyBase} on last day`;
    if (config.monthlyMode === "NTH_WEEKDAY") {
      const nth = config.nthWeek === -1 ? "last" : config.nthWeek === 2 ? "second" : config.nthWeek === 3 ? "third" : config.nthWeek === 4 ? "fourth" : "first";
      const day = WEEKDAY_SHORT[Math.min(6, Math.max(0, Number(config.weekday ?? 1)))];
      return `${monthlyBase} on ${nth} ${day}`;
    }
    return `${monthlyBase} on day ${Math.min(31, Math.max(1, Number(config.dayOfMonth ?? 1)))}`;
  }
  if (config.repeat === "YEARLY") {
    const month = MONTH_SHORT[Math.min(11, Math.max(0, Number(config.monthOfYear ?? 1) - 1))];
    const day = Math.min(31, Math.max(1, Number(config.dayOfYearMonth ?? 1)));
    return `Every year on ${day} ${month}`;
  }
  if (config.repeat === "CUSTOM") {
    const unit = String(config.customUnit ?? "DAY").toLowerCase();
    return `Every ${interval} ${pluralize(unit, interval)}`;
  }
  return "Does not repeat";
}

function recurrenceEnd(config: TaskRecurrenceConfig): string {
  if (config.endType === "ON_DATE" && config.endDate) {
    return `Ends on ${config.endDate}`;
  }
  if (config.endType === "AFTER_OCCURRENCES") {
    const count = Math.max(1, Number(config.endAfterOccurrences ?? 1));
    return `Ends after ${count} ${pluralize("occurrence", count)}`;
  }
  return "Ends never";
}

export function recurrenceSummary(config?: TaskRecurrenceConfig): string | null {
  if (!config?.repeat || config.repeat === "NONE") return null;
  return `${recurrenceCadence(config)} • ${recurrenceEnd(config)}`;
}
