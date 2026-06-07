import type { TaskRecurrenceDto } from './dto/recurrence.dto';

const DAY_MS = 24 * 60 * 60 * 1000;

function toDate(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map((n) => Number(n));
  return new Date(y, m - 1, d);
}

export function toYmd(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

function addDays(ymd: string, days: number): string {
  const d = toDate(ymd);
  d.setDate(d.getDate() + days);
  return toYmd(d);
}

function addMonths(ymd: string, months: number): string {
  const d = toDate(ymd);
  const originalDay = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < originalDay) {
    d.setDate(0);
  }
  return toYmd(d);
}

function addYears(ymd: string, years: number): string {
  const d = toDate(ymd);
  d.setFullYear(d.getFullYear() + years);
  return toYmd(d);
}

function lastDayOfMonth(year: number, month1: number): number {
  return new Date(year, month1, 0).getDate();
}

function nthWeekdayOfMonth(
  year: number,
  month1: number,
  nthWeek: number,
  weekday: number,
): number {
  if (nthWeek === -1) {
    const lastDay = lastDayOfMonth(year, month1);
    for (let day = lastDay; day >= 1; day--) {
      if (new Date(year, month1 - 1, day).getDay() === weekday) return day;
    }
    return lastDay;
  }

  let seen = 0;
  const max = lastDayOfMonth(year, month1);
  for (let day = 1; day <= max; day++) {
    if (new Date(year, month1 - 1, day).getDay() === weekday) {
      seen += 1;
      if (seen === nthWeek) return day;
    }
  }
  return max;
}

export function computeNextRecurringDueDate(
  currentDueDate: string,
  startDueDate: string,
  recurrence: TaskRecurrenceDto,
): string {
  const repeat = recurrence.repeat ?? 'NONE';
  const interval = Math.max(1, recurrence.interval ?? 1);
  if (repeat === 'NONE') return currentDueDate;
  if (repeat === 'DAILY') return addDays(currentDueDate, interval);

  if (repeat === 'WEEKLY') {
    const weeklyDays = Array.from(new Set((recurrence.weeklyDays ?? []).map((d) => Number(d))))
      .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
      .sort((a, b) => a - b);
    const start = toDate(startDueDate);
    const current = toDate(currentDueDate);
    for (let i = 1; i <= 3700; i++) {
      const candidate = new Date(current.getTime() + i * DAY_MS);
      const day = candidate.getDay();
      if (weeklyDays.length > 0 && !weeklyDays.includes(day)) continue;
      if (weeklyDays.length === 0 && day !== start.getDay()) continue;
      const weekDiff = Math.floor(
        (candidate.getTime() - new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime()) /
          (7 * DAY_MS),
      );
      if (weekDiff % interval === 0) return toYmd(candidate);
    }
    return addDays(currentDueDate, 7 * interval);
  }

  if (repeat === 'MONTHLY') {
    const mode = recurrence.monthlyMode ?? 'DAY_OF_MONTH';
    const current = toDate(currentDueDate);
    const targetDate = new Date(current.getFullYear(), current.getMonth(), 1);
    targetDate.setMonth(targetDate.getMonth() + interval);
    const year = targetDate.getFullYear();
    const month1 = targetDate.getMonth() + 1;

    if (mode === 'LAST_DAY') {
      return toYmd(new Date(year, month1 - 1, lastDayOfMonth(year, month1)));
    }
    if (mode === 'NTH_WEEKDAY') {
      const nthWeek = recurrence.nthWeek ?? 1;
      const weekday = recurrence.weekday ?? toDate(startDueDate).getDay();
      const day = nthWeekdayOfMonth(year, month1, nthWeek, weekday);
      return toYmd(new Date(year, month1 - 1, day));
    }
    const preferredDay = recurrence.dayOfMonth ?? toDate(startDueDate).getDate();
    const day = Math.min(preferredDay, lastDayOfMonth(year, month1));
    return toYmd(new Date(year, month1 - 1, day));
  }

  if (repeat === 'YEARLY') {
    const current = toDate(currentDueDate);
    const year = current.getFullYear() + interval;
    const month1 = recurrence.monthOfYear ?? toDate(startDueDate).getMonth() + 1;
    const preferredDay = recurrence.dayOfYearMonth ?? toDate(startDueDate).getDate();
    const day = Math.min(preferredDay, lastDayOfMonth(year, month1));
    return toYmd(new Date(year, month1 - 1, day));
  }

  // CUSTOM
  const customUnit = recurrence.customUnit ?? 'DAY';
  if (customUnit === 'WEEK') return addDays(currentDueDate, interval * 7);
  if (customUnit === 'MONTH') return addMonths(currentDueDate, interval);
  if (customUnit === 'YEAR') return addYears(currentDueDate, interval);
  return addDays(currentDueDate, interval);
}

export function shouldStopRecurrence(
  generatedCount: number,
  nextDueDate: string,
  recurrence: TaskRecurrenceDto,
): boolean {
  const endType = recurrence.endType ?? 'NEVER';
  if (endType === 'AFTER_OCCURRENCES') {
    const maxCount = recurrence.endAfterOccurrences ?? 0;
    return maxCount > 0 && generatedCount >= maxCount;
  }
  if (endType === 'ON_DATE' && recurrence.endDate) {
    return nextDueDate > recurrence.endDate;
  }
  return false;
}

export function subtractDays(ymd: string, days: number): string {
  return addDays(ymd, -days);
}

