"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getRecurringOccurrenceStatus,
  OCCURRENCE_STATUS_STYLES,
} from "@/lib/recurring-board-filters";
import { recurrenceBadgeLabel } from "@/lib/recurring-board-utils";
import {
  allOccurrenceSubtasksDone,
  getOccurrenceSubtaskProgress,
} from "@/lib/recurring-subtask-utils";
import { getRecurringCardTheme } from "@/lib/recurring-card-theme";
import { EXEC_PLANNER } from "@/lib/executive-planner-theme";
import { RecurringSubtaskChecklist } from "@/components/recurring/recurring-subtask-checklist";
import type { Task, RecurringTemplateSummary, WorkflowStatus } from "@/types/api";
import {
  AlarmClock,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  PartyPopper,
  SkipForward,
} from "lucide-react";

interface RecurringDayDrawerProps {
  dateKey: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: Task[];
  recurringTemplateMap?: Record<string, RecurringTemplateSummary>;
  statuses: WorkflowStatus[];
  overdueTaskIds: string[];
  readOnly?: boolean;
  isLoading?: boolean;
  isCompletingDay?: boolean;
  boardQueryKey?: readonly unknown[];
  onTaskUpdated?: (task: Task) => void;
  onMarkDone?: (task: Task) => void;
  onSkip?: (task: Task) => void;
  onSnooze?: (task: Task) => void;
  onOpenDetails?: (taskId: string) => void;
  onCompleteDay?: (tasks: Task[]) => void;
}

function formatDayLabel(dateKey: string): string {
  return new Date(dateKey + "T12:00:00").toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function isRunComplete(
  task: Task,
  overdueTaskIds: string[],
  statuses: WorkflowStatus[]
): boolean {
  const status = getRecurringOccurrenceStatus(task, overdueTaskIds, statuses);
  if (status === "done") return true;
  return allOccurrenceSubtasksDone(task.subtasks);
}

export function RecurringDayDrawer({
  dateKey,
  open,
  onOpenChange,
  tasks,
  recurringTemplateMap = {},
  statuses,
  overdueTaskIds,
  readOnly,
  isLoading,
  isCompletingDay,
  boardQueryKey,
  onTaskUpdated,
  onMarkDone,
  onSkip,
  onSnooze,
  onOpenDetails,
  onCompleteDay,
}: RecurringDayDrawerProps) {
  const dayLabel = dateKey ? formatDayLabel(dateKey) : "";
  const [expandedRuns, setExpandedRuns] = useState<Set<string>>(new Set());
  const [showDayComplete, setShowDayComplete] = useState(false);

  const dayProgress = useMemo(() => {
    let total = 0;
    let completed = 0;
    for (const task of tasks) {
      const p = getOccurrenceSubtaskProgress(task.subtasks);
      total += p.total;
      completed += p.completed;
    }
    return { total, completed };
  }, [tasks]);

  const sortedTasks = useMemo(
    () =>
      [...tasks].sort((a, b) => {
        const order: Record<string, number> = {
          missed: 0,
          overdue: 1,
          todo: 2,
          in_progress: 3,
          done: 4,
        };
        const sa = getRecurringOccurrenceStatus(a, overdueTaskIds, statuses);
        const sb = getRecurringOccurrenceStatus(b, overdueTaskIds, statuses);
        return (order[sa] ?? 9) - (order[sb] ?? 9);
      }),
    [tasks, overdueTaskIds, statuses]
  );

  const incompleteRuns = useMemo(
    () =>
      sortedTasks.filter(
        (t) => !isRunComplete(t, overdueTaskIds, statuses)
      ),
    [sortedTasks, overdueTaskIds, statuses]
  );

  const canCompleteDay =
    !readOnly &&
    sortedTasks.length > 0 &&
    incompleteRuns.every((t) => {
      const p = getOccurrenceSubtaskProgress(t.subtasks);
      return p.total === 0 || p.completed === p.total;
    }) &&
    incompleteRuns.length > 0;

  const allRunsDone =
    sortedTasks.length > 0 &&
    sortedTasks.every((t) => isRunComplete(t, overdueTaskIds, statuses));

  useEffect(() => {
    if (!open) return;
    setExpandedRuns(new Set(sortedTasks.map((t) => t.id)));
  }, [open, dateKey, sortedTasks]);

  useEffect(() => {
    if (allRunsDone && open && sortedTasks.length > 0) {
      setShowDayComplete(true);
      const timer = setTimeout(() => setShowDayComplete(false), 4000);
      return () => clearTimeout(timer);
    }
    setShowDayComplete(false);
  }, [allRunsDone, open, sortedTasks.length]);

  function toggleRun(taskId: string) {
    setExpandedRuns((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="exec-planner-drawer flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-[480px]"
      >
        <div className="shrink-0 border-b bg-gradient-to-br from-amber-50/50 via-card to-muted/20 px-6 pb-4 pt-6 dark:from-amber-950/15">
          <span className="mb-3 inline-block h-1 w-14 rounded-full bg-amber-400/80" />
          <SheetHeader className="space-y-1 text-left">
            <SheetTitle className="flex items-center gap-2 text-xl font-semibold tracking-tight">
              <CalendarDays className="h-5 w-5 text-amber-600" />
              {dayLabel || "Select a day"}
            </SheetTitle>
            <SheetDescription className="text-xs">
              {tasks.length === 0
                ? "No recurring runs scheduled for this date."
                : `${tasks.length} ${tasks.length === 1 ? "run" : "runs"} · check off subtasks below`}
            </SheetDescription>
          </SheetHeader>

          {showDayComplete ? (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2.5 text-sm font-medium text-emerald-800 animate-in fade-in slide-in-from-top-1 dark:text-emerald-200">
              <PartyPopper className="h-4 w-4 shrink-0" />
              All runs complete for this day!
            </div>
          ) : null}

          {dayProgress.total > 0 ? (
            <div className="mt-4 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Day progress</span>
                <span className="font-semibold tabular-nums text-foreground">
                  {dayProgress.completed}/{dayProgress.total} subtasks
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted/60">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500 ease-out"
                  style={{
                    width: `${(dayProgress.completed / dayProgress.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
            </div>
          ) : sortedTasks.length === 0 ? (
            <div className={cn(EXEC_PLANNER.paperCard, "px-4 py-8 text-center")}>
              <p className="text-sm font-medium">Nothing scheduled</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Pick another date on the calendar, or create a recurring series to populate your
                planner.
              </p>
            </div>
          ) : (
            sortedTasks.map((task) => {
              const template = task.recurringTemplateId
                ? recurringTemplateMap[task.recurringTemplateId]
                : undefined;
              const status = getRecurringOccurrenceStatus(task, overdueTaskIds, statuses);
              const statusStyle = OCCURRENCE_STATUS_STYLES[status];
              const theme = getRecurringCardTheme(template?.repeatType ?? task.recurrenceType);
              const badge = recurrenceBadgeLabel(task);
              const progress = getOccurrenceSubtaskProgress(task.subtasks);
              const seriesName = template?.title ?? task.title;
              const isExpanded = expandedRuns.has(task.id);
              const canMarkDone =
                !readOnly &&
                status !== "done" &&
                (progress.total === 0 || progress.completed === progress.total);

              return (
                <article
                  key={task.id}
                  className={cn(EXEC_PLANNER.paperCard, "relative overflow-hidden")}
                >
                  <div className={cn("absolute inset-y-0 left-0 w-1", theme.rail)} />
                  <button
                    type="button"
                    onClick={() => toggleRun(task.id)}
                    className="flex w-full items-start justify-between gap-2 p-4 pb-2 pl-5 text-left"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-[10px] font-medium text-muted-foreground">{seriesName}</p>
                      <div className="flex flex-wrap items-start gap-2">
                        <h3 className="text-base font-semibold leading-snug">{task.title}</h3>
                        <Badge
                          variant="outline"
                          className={cn(
                            "shrink-0 text-[10px]",
                            statusStyle.bg,
                            statusStyle.text,
                            statusStyle.border
                          )}
                        >
                          {statusStyle.label}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        {badge ? (
                          <span
                            className={cn(
                              "rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
                              theme.ribbon
                            )}
                          >
                            {badge}
                          </span>
                        ) : null}
                        {task.recurrenceSequence ? (
                          <span className="text-[10px] text-muted-foreground">
                            Run #{task.recurrenceSequence}
                          </span>
                        ) : null}
                        {progress.total > 0 ? (
                          <span className="text-[10px] tabular-nums text-muted-foreground">
                            {progress.completed}/{progress.total}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <ChevronDown
                      className={cn(
                        "mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                        isExpanded && "rotate-180"
                      )}
                    />
                  </button>

                  {isExpanded ? (
                    <div className="space-y-3 px-4 pb-4 pl-5">
                      <RecurringSubtaskChecklist
                        task={task}
                        taskId={task.id}
                        open={open}
                        readOnly={readOnly}
                        allowAdd
                        showWhenEmpty
                        stickyAdd
                        boardQueryKey={boardQueryKey}
                        onTaskUpdated={onTaskUpdated}
                      />

                      {!readOnly ? (
                        <div className="flex flex-wrap gap-2 border-t border-border/35 pt-3">
                          <Button
                            size="sm"
                            className="h-8 gap-1.5 text-xs"
                            disabled={!canMarkDone}
                            onClick={() => onMarkDone?.(task)}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Mark done
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1.5 text-xs"
                            onClick={() => onSnooze?.(task)}
                          >
                            <AlarmClock className="h-3.5 w-3.5" />
                            Snooze
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1.5 text-xs"
                            onClick={() => onSkip?.(task)}
                          >
                            <SkipForward className="h-3.5 w-3.5" />
                            Skip next run
                          </Button>
                          {onOpenDetails ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="ml-auto h-8 gap-1.5 text-xs text-muted-foreground"
                              onClick={() => onOpenDetails(task.id)}
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              Details
                            </Button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              );
            })
          )}
        </div>

        {!readOnly && sortedTasks.length > 0 && !isLoading ? (
          <div className="shrink-0 border-t border-border/45 bg-muted/10 p-4">
            <Button
              className="w-full gap-2"
              disabled={!canCompleteDay || isCompletingDay}
              onClick={() => onCompleteDay?.(incompleteRuns)}
            >
              <CheckCircle2 className="h-4 w-4" />
              {isCompletingDay ? "Completing..." : "Complete day"}
            </Button>
            {!canCompleteDay && incompleteRuns.length > 0 ? (
              <p className="mt-2 text-center text-[10px] text-muted-foreground">
                Finish all subtasks to complete every run for this day.
              </p>
            ) : null}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
