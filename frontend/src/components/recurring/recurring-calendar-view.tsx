"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { Task, WorkflowStatus } from "@/types/api";
import {
  getRecurringOccurrenceStatus,
  OCCURRENCE_STATUS_STYLES,
  type RecurringOccurrenceStatus,
} from "@/lib/recurring-board-filters";
import { EXEC_PLANNER } from "@/lib/executive-planner-theme";
import { getOccurrenceSubtaskProgress } from "@/lib/recurring-subtask-utils";

const MULTI_RUN_INCOMPLETE_CHIP = {
  bg: "bg-rose-500/12",
  text: "text-rose-700 dark:text-rose-300",
  border: "border-rose-400/30",
};

const MULTI_RUN_COMPLETE_CHIP = {
  bg: "bg-emerald-500/10",
  text: "text-emerald-700 dark:text-emerald-300",
  border: "border-emerald-400/25",
};

function isPlannerRunComplete(
  status: RecurringOccurrenceStatus,
  subtaskProgress: { completed: number; total: number }
): boolean {
  if (status === "done") return true;
  if (subtaskProgress.total > 0) {
    return subtaskProgress.completed === subtaskProgress.total;
  }
  return false;
}
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface RecurringCalendarViewProps {
  tasks: Task[];
  statuses: WorkflowStatus[];
  overdueTaskIds: string[];
  selectedDateKey?: string | null;
  onDateClick?: (dateKey: string, dayTasks: Task[]) => void;
  onTaskClick?: (task: Task) => void;
  className?: string;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function parseDateKey(value?: string): string | null {
  if (!value) return null;
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

function dateKeyFromDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function shiftDateKey(key: string, deltaDays: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + deltaDays);
  return dateKeyFromDate(date);
}

function getMonthMatrix(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month, 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function countMissedOnDay(tasks: Task[], overdueTaskIds: string[], statuses: WorkflowStatus[]): number {
  return tasks.filter(
    (t) => getRecurringOccurrenceStatus(t, overdueTaskIds, statuses) === "missed"
  ).length;
}

function daySubtaskProgress(tasks: Task[]): { completed: number; total: number } {
  let completed = 0;
  let total = 0;
  for (const task of tasks) {
    const p = getOccurrenceSubtaskProgress(task.subtasks);
    completed += p.completed;
    total += p.total;
  }
  return { completed, total };
}

export function RecurringCalendarView({
  tasks,
  statuses,
  overdueTaskIds,
  selectedDateKey = null,
  onDateClick,
  onTaskClick,
  className,
}: RecurringCalendarViewProps) {
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));
  const todayKey = parseDateKey(new Date().toISOString()) ?? dateKeyFromDate(new Date());
  const [focusedDateKey, setFocusedDateKey] = useState<string>(selectedDateKey ?? todayKey);

  useEffect(() => {
    if (selectedDateKey) setFocusedDateKey(selectedDateKey);
  }, [selectedDateKey]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      const key = parseDateKey(task.dueDate);
      if (!key) continue;
      const list = map.get(key) ?? [];
      list.push(task);
      map.set(key, list);
    }
    return map;
  }, [tasks]);

  const weeks = useMemo(() => getMonthMatrix(year, month), [year, month]);

  const handleDayClick = useCallback(
    (key: string, dayTasks: Task[]) => {
      setFocusedDateKey(key);
      onDateClick?.(key, dayTasks);
    },
    [onDateClick]
  );

  function shiftMonth(delta: number) {
    setCursor(new Date(year, month + delta, 1));
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable
      ) {
        return;
      }

      let nextKey = focusedDateKey;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        nextKey = shiftDateKey(focusedDateKey, -1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        nextKey = shiftDateKey(focusedDateKey, 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        nextKey = shiftDateKey(focusedDateKey, -7);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        nextKey = shiftDateKey(focusedDateKey, 7);
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleDayClick(focusedDateKey, tasksByDate.get(focusedDateKey) ?? []);
        return;
      } else {
        return;
      }

      setFocusedDateKey(nextKey);
      const [y, m] = nextKey.split("-").map(Number);
      if (y !== year || m - 1 !== month) {
        setCursor(new Date(y, m - 1, 1));
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [focusedDateKey, year, month, tasksByDate, handleDayClick]);

  return (
    <div
      className={cn(
        EXEC_PLANNER.paperCard,
        "flex min-h-0 flex-1 flex-col overflow-hidden",
        className
      )}
      role="application"
      aria-label="Recurring tasks calendar"
    >
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border/45 bg-gradient-to-r from-amber-50/30 via-card to-muted/10 px-4 py-3 dark:from-amber-950/10">
        <div>
          <p className={EXEC_PLANNER.sectionLabel}>Your planner</p>
          <h2 className="text-sm font-semibold tracking-tight">{monthLabel}</h2>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            Click a date · arrow keys + Enter
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => shiftMonth(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => {
              setCursor(startOfDay(new Date()));
              handleDayClick(todayKey, tasksByDate.get(todayKey) ?? []);
            }}
          >
            Today
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => shiftMonth(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap gap-2 border-b border-border/35 px-4 py-2">
        {Object.entries(OCCURRENCE_STATUS_STYLES).map(([key, style]) => (
          <span
            key={key}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium",
              style.bg,
              style.text,
              style.border
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
            {style.label}
          </span>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-2 sm:p-3">
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
            >
              {label}
            </div>
          ))}
        </div>

        <div className="mt-1.5 space-y-1" role="grid">
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 gap-1" role="row">
              {week.map((date, di) => {
                if (!date) {
                  return (
                    <div
                      key={di}
                      className="min-h-[7.5rem] rounded-xl bg-muted/10 sm:min-h-[6.5rem]"
                      role="gridcell"
                    />
                  );
                }
                const key = dateKeyFromDate(date);
                const dayTasks = tasksByDate.get(key) ?? [];
                const isToday = key === todayKey;
                const isSelected = key === selectedDateKey;
                const isFocused = key === focusedDateKey;
                const inCurrentMonth = date.getMonth() === month;
                const missedCount = countMissedOnDay(dayTasks, overdueTaskIds, statuses);
                const dayProgress = daySubtaskProgress(dayTasks);
                const weekdayLong = date.toLocaleDateString(undefined, { weekday: "long" });

                return (
                  <button
                    key={di}
                    type="button"
                    role="gridcell"
                    aria-selected={isSelected}
                    aria-label={`${weekdayLong}, ${date.toLocaleDateString(undefined, { month: "long", day: "numeric" })}${dayTasks.length ? `, ${dayTasks.length} runs` : ""}`}
                    onClick={() => handleDayClick(key, dayTasks)}
                    onFocus={() => setFocusedDateKey(key)}
                    className={cn(
                      "group/cell relative min-h-[7.5rem] overflow-hidden rounded-xl border p-2 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:min-h-[6.5rem]",
                      isToday
                        ? "border-amber-400/50 bg-amber-50/40 ring-2 ring-amber-400/20 dark:bg-amber-950/15"
                        : "border-border/45 bg-card/70 hover:border-primary/25",
                      isSelected && "ring-2 ring-primary/30 shadow-md",
                      isFocused && !isSelected && "ring-1 ring-primary/20",
                      !inCurrentMonth && "opacity-40"
                    )}
                  >
                    <div className="mb-1.5 flex w-full items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "inline-flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-bold tabular-nums sm:h-5 sm:w-5",
                            isToday ? "bg-amber-500 text-white" : "text-foreground"
                          )}
                        >
                          {date.getDate()}
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {missedCount > 0 ? (
                          <span className="rounded-full bg-rose-500/15 px-1 py-0.5 text-[8px] font-bold text-rose-700 dark:text-rose-300">
                            {missedCount}
                          </span>
                        ) : null}
                        {dayTasks.length > 0 ? (
                          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[8px] font-semibold tabular-nums text-primary">
                            {dayTasks.length}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {dayProgress.total > 0 ? (
                      <div className="mb-1.5">
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted/50">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                            style={{
                              width: `${(dayProgress.completed / dayProgress.total) * 100}%`,
                            }}
                          />
                        </div>
                        <p className="mt-0.5 text-[9px] tabular-nums text-muted-foreground">
                          {dayProgress.completed}/{dayProgress.total}
                        </p>
                      </div>
                    ) : null}

                    <div className="space-y-0.5">
                      {dayTasks.slice(0, 2).map((task) => {
                        const status = getRecurringOccurrenceStatus(
                          task,
                          overdueTaskIds,
                          statuses
                        );
                        const style = OCCURRENCE_STATUS_STYLES[status];
                        const subtaskProgress = getOccurrenceSubtaskProgress(task.subtasks);
                        const multipleRuns = dayTasks.length > 1;
                        const runComplete = isPlannerRunComplete(status, subtaskProgress);
                        const chipStyle = multipleRuns
                          ? runComplete
                            ? MULTI_RUN_COMPLETE_CHIP
                            : MULTI_RUN_INCOMPLETE_CHIP
                          : style;
                        return (
                          <span
                            key={task.id}
                            role="presentation"
                            onClick={(e) => {
                              e.stopPropagation();
                              onTaskClick?.(task);
                              handleDayClick(key, dayTasks);
                            }}
                            className={cn(
                              "block w-full truncate rounded-md border px-1 py-0.5 text-[9px] font-medium sm:text-[8px]",
                              chipStyle.bg,
                              chipStyle.text,
                              chipStyle.border
                            )}
                            title={task.title}
                          >
                            {task.title}
                            {subtaskProgress.total > 0 ? (
                              <span className="ml-1 opacity-70">
                                · {subtaskProgress.completed}/{subtaskProgress.total}
                              </span>
                            ) : null}
                          </span>
                        );
                      })}
                      {dayTasks.length > 2 ? (
                        <span className="text-[9px] text-muted-foreground sm:text-[8px]">
                          +{dayTasks.length - 2} more
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {tasks.filter((t) => parseDateKey(t.dueDate)).length === 0 ? (
        <div className="border-t border-border/35 px-4 py-8 text-center">
          <p className="text-sm font-medium text-foreground/90">
            No recurring runs scheduled yet.
          </p>
          <p className="mx-auto mt-1.5 max-w-md text-xs text-muted-foreground">
            Create a planner and generated runs will appear on this calendar.
          </p>
        </div>
      ) : null}
    </div>
  );
}
