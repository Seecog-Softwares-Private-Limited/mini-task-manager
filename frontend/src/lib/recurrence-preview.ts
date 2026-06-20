import type { TaskRecurrenceConfig } from "@/types/api";

/**
 * Lightweight, client-side projection of the next few recurring runs for the
 * planner builder preview. This intentionally mirrors the common backend
 * recurrence rules closely enough for an at-a-glance preview — it is NOT the
 * source of truth for generated occurrences (the backend remains authoritative).
 */

function stripTime(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseAnchor(startDate?: string): Date | null {
  if (!startDate) return null;
  const parsed = new Date(startDate);
  if (Number.isNaN(parsed.getTime())) return null;
  return stripTime(parsed);
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function advancePastWeekends(date: Date, skipWeekends?: boolean): Date {
  if (!skipWeekends) return date;
  const next = new Date(date);
  while (isWeekend(next)) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function clampDayOfMonth(year: number, month: number, day: number): Date {
  const max = lastDayOfMonth(year, month);
  return new Date(year, month, Math.min(Math.max(1, day), max));
}

/** nth occurrence (1..4, or -1 for last) of `weekday` (0=Sun) in a month. */
function nthWeekdayOfMonth(
  year: number,
  month: number,
  weekday: number,
  nth: number
): Date {
  if (nth === -1) {
    const last = lastDayOfMonth(year, month);
    for (let day = last; day >= 1; day -= 1) {
      const date = new Date(year, month, day);
      if (date.getDay() === weekday) return date;
    }
    return new Date(year, month, last);
  }
  let count = 0;
  const max = lastDayOfMonth(year, month);
  for (let day = 1; day <= max; day += 1) {
    const date = new Date(year, month, day);
    if (date.getDay() === weekday) {
      count += 1;
      if (count === nth) return date;
    }
  }
  return new Date(year, month, max);
}

function withinEnd(
  date: Date,
  config: TaskRecurrenceConfig,
  index: number
): boolean {
  if (config.endType === "ON_DATE" && config.endDate) {
    const end = new Date(config.endDate);
    if (!Number.isNaN(end.getTime()) && date > stripTime(end)) return false;
  }
  if (config.endType === "AFTER_OCCURRENCES") {
    const max = Math.max(1, Number(config.endAfterOccurrences ?? 1));
    if (index >= max) return false;
  }
  return true;
}

/**
 * Returns up to `count` upcoming run dates starting from the anchor (first run).
 */
export function computeNextRuns(
  config?: TaskRecurrenceConfig,
  startDate?: string,
  count = 3
): Date[] {
  if (!config?.repeat || config.repeat === "NONE") return [];
  const anchor = parseAnchor(startDate);
  if (!anchor) return [];
  const interval = Math.max(1, Number(config.interval ?? 1));
  const skipWeekends = Boolean(config.skipWeekends);
  const results: Date[] = [];

  const push = (date: Date) => {
    if (results.length >= count) return;
    const adjusted = advancePastWeekends(stripTime(date), skipWeekends);
    if (!withinEnd(adjusted, config, results.length)) return;
    results.push(adjusted);
  };

  switch (config.repeat) {
    case "DAILY": {
      for (let i = 0; results.length < count && i < count * interval + count; i += 1) {
        push(addDays(anchor, i * interval));
      }
      break;
    }
    case "WEEKLY": {
      const days = (config.weeklyDays ?? []).filter((d) => d >= 0 && d <= 6);
      if (days.length === 0) {
        for (let i = 0; results.length < count && i < count + 2; i += 1) {
          push(addDays(anchor, i * interval * 7));
        }
        break;
      }
      const daySet = new Set(days);
      // Anchor the "week 0" to the Sunday of the anchor's week.
      const weekStart = addDays(anchor, -anchor.getDay());
      for (
        let dayOffset = 0;
        results.length < count && dayOffset < 366;
        dayOffset += 1
      ) {
        const date = addDays(anchor, dayOffset);
        if (date < anchor) continue;
        if (!daySet.has(date.getDay())) continue;
        const weeksFromStart = Math.floor(
          (stripTime(date).getTime() - weekStart.getTime()) /
            (7 * 24 * 60 * 60 * 1000)
        );
        if (weeksFromStart % interval !== 0) continue;
        push(date);
      }
      break;
    }
    case "MONTHLY": {
      const mode = config.monthlyMode ?? "DAY_OF_MONTH";
      for (let i = 0; results.length < count && i < count + 2; i += 1) {
        const baseMonth = anchor.getMonth() + i * interval;
        const year = anchor.getFullYear() + Math.floor(baseMonth / 12);
        const month = ((baseMonth % 12) + 12) % 12;
        if (mode === "LAST_DAY") {
          push(new Date(year, month, lastDayOfMonth(year, month)));
        } else if (mode === "NTH_WEEKDAY") {
          push(
            nthWeekdayOfMonth(
              year,
              month,
              Number(config.weekday ?? 1),
              Number(config.nthWeek ?? 1)
            )
          );
        } else {
          push(clampDayOfMonth(year, month, Number(config.dayOfMonth ?? anchor.getDate())));
        }
      }
      break;
    }
    case "YEARLY": {
      const month = Math.min(11, Math.max(0, Number(config.monthOfYear ?? 1) - 1));
      const day = Number(config.dayOfYearMonth ?? 1);
      for (let i = 0; results.length < count && i < count + 2; i += 1) {
        const year = anchor.getFullYear() + i * interval;
        push(clampDayOfMonth(year, month, day));
      }
      break;
    }
    case "CUSTOM": {
      const unit = String(config.customUnit ?? "DAY").toUpperCase();
      for (let i = 0; results.length < count && i < count * interval + count; i += 1) {
        if (unit === "WEEK") push(addDays(anchor, i * interval * 7));
        else if (unit === "MONTH") {
          const baseMonth = anchor.getMonth() + i * interval;
          const year = anchor.getFullYear() + Math.floor(baseMonth / 12);
          const month = ((baseMonth % 12) + 12) % 12;
          push(clampDayOfMonth(year, month, anchor.getDate()));
        } else if (unit === "YEAR") {
          push(clampDayOfMonth(anchor.getFullYear() + i * interval, anchor.getMonth(), anchor.getDate()));
        } else {
          push(addDays(anchor, i * interval));
        }
      }
      break;
    }
    default:
      break;
  }

  return results.slice(0, count);
}

export function formatRunDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function formatRunTime(dueTime?: string): string | null {
  if (!dueTime) return null;
  const [hRaw, mRaw] = dueTime.split(":");
  const hours = Number(hRaw);
  const minutes = Number(mRaw);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
