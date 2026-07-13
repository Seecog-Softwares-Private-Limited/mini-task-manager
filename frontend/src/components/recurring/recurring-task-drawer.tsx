"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { UserAvatar } from "@/components/ui/user-avatar";
import type { AssigneeMap } from "@/components/kanban/kanban-board";
import type { Task, WorkflowStatus, RecurringTemplateSummary } from "@/types/api";
import { fetchTask } from "@/services/api/tasks.api";
import { fetchRecurringTemplateHistory } from "@/services/api/recurring-tasks.api";
import { formatShortDate, recurrenceBadgeLabel } from "@/lib/recurring-board-utils";
import {
  getRecurringOccurrenceStatus,
  isTaskOverdue,
  OCCURRENCE_STATUS_STYLES,
} from "@/lib/recurring-board-filters";
import { toRecurrenceLabel } from "@/lib/recurrence-display";
import { getRecurringCardTheme } from "@/lib/recurring-card-theme";
import { EXEC_PLANNER } from "@/lib/executive-planner-theme";
import {
  allOccurrenceSubtasksDone,
  getOccurrenceSubtaskProgress,
} from "@/lib/recurring-subtask-utils";
import {
  RecurringSubtaskChecklist,
} from "@/components/recurring/recurring-subtask-checklist";
import {
  AlarmClock,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  History,
  MessageSquare,
  Paperclip,
  Pause,
  Repeat,
  SkipForward,
  Users,
} from "lucide-react";

interface RecurringTaskDrawerProps {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: RecurringTemplateSummary;
  assigneeMap?: AssigneeMap;
  statuses?: WorkflowStatus[];
  overdueTaskIds?: string[];
  commentCount?: number;
  attachmentCount?: number;
  readOnly?: boolean;
  boardQueryKey?: readonly unknown[];
  onTaskUpdated?: (task: Task) => void;
  onMarkDone?: (task: Task) => void;
  onSkip?: (task: Task) => void;
  onSnooze?: (task: Task) => void;
  onPauseSeries?: (task: Task) => void;
  onOpenFullDetails?: (taskId: string) => void;
}

export function RecurringTaskDrawer({
  taskId,
  open,
  onOpenChange,
  template,
  assigneeMap,
  statuses = [],
  overdueTaskIds = [],
  commentCount = 0,
  attachmentCount = 0,
  readOnly,
  boardQueryKey,
  onTaskUpdated,
  onMarkDone,
  onSkip,
  onSnooze,
  onPauseSeries,
  onOpenFullDetails,
}: RecurringTaskDrawerProps) {
  const { data: task, isLoading } = useQuery({
    queryKey: ["task", taskId ?? ""],
    queryFn: () => fetchTask(taskId!),
    enabled: open && Boolean(taskId),
  });

  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ["recurring-template-history", task?.recurringTemplateId ?? ""],
    queryFn: () => fetchRecurringTemplateHistory(task!.recurringTemplateId!),
    enabled: open && Boolean(task?.recurringTemplateId),
  });

  const theme = getRecurringCardTheme(template?.repeatType ?? task?.recurrenceType);
  const seriesTitle = template?.title ?? task?.title ?? "Recurring series";
  const badge = task ? recurrenceBadgeLabel(task) : null;

  const assignees = useMemo(() => {
    if (!task) return [];
    const ids = task.assigneeIds?.length ? task.assigneeIds : task.assigneeId ? [task.assigneeId] : [];
    return ids.map((id) => ({
      id,
      name:
        assigneeMap?.[id]?.name ??
        (task.assigneeId === id ? task.assignee?.fullName ?? task.assignee?.email : undefined) ??
        "User",
      avatarUrl:
        assigneeMap?.[id]?.avatarUrl ??
        (task.assigneeId === id ? task.assignee?.avatarUrl : undefined),
    }));
  }, [task, assigneeMap]);

  const statusName = statuses.find((s) => s.id === task?.statusId)?.name ?? "Unknown";
  const occurrenceStatus = task
    ? getRecurringOccurrenceStatus(task, overdueTaskIds, statuses)
    : null;
  const occurrenceStyle = occurrenceStatus
    ? OCCURRENCE_STATUS_STYLES[occurrenceStatus]
    : null;
  const subtaskProgress = getOccurrenceSubtaskProgress(task?.subtasks);
  const canMarkRunDone =
    !readOnly &&
    !!task &&
    allOccurrenceSubtasksDone(task.subtasks) &&
    occurrenceStatus !== "done";
  const activityComments = commentCount;
  const activityAttachments = attachmentCount;

  const recurrenceRule = template?.repeatType
    ? `${toRecurrenceLabel(template.repeatType)} · ${template.endType === "NEVER" ? "Never ends" : template.endType.replace("_", " ").toLowerCase()}`
    : task?.recurrenceType
      ? toRecurrenceLabel(task.recurrenceType)
      : "—";

  const upcomingRuns = useMemo(() => {
    const items: { label: string; date: string }[] = [];
    if (template?.nextDueDate) {
      items.push({
        label: "Next scheduled",
        date: formatShortDate(String(template.nextDueDate).slice(0, 10)),
      });
    }
    if (task?.dueDate) {
      items.push({
        label: "Current occurrence",
        date: formatShortDate(task.dueDate),
      });
    }
    return items;
  }, [template?.nextDueDate, task?.dueDate]);

  const recentHistory = history.slice(0, 8);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="exec-planner-drawer flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-[440px]"
      >
        <div className={cn("shrink-0 border-b px-6 pb-4 pt-6", theme.surface)}>
          <span className={cn("mb-3 inline-block h-1 w-14 rounded-full", theme.rail)} />
          <SheetHeader className="space-y-2 text-left">
            <SheetTitle className="text-xl font-semibold leading-snug tracking-tight">
              {isLoading ? <Skeleton className="h-7 w-3/4" /> : task?.title ?? "Occurrence"}
            </SheetTitle>
            <SheetDescription className="text-xs leading-relaxed">
              <span className="font-medium text-foreground">{seriesTitle}</span>
            </SheetDescription>
          </SheetHeader>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {badge ? (
              <Badge variant="outline" className={cn("gap-1 text-[10px]", theme.ribbon)}>
                <Repeat className="h-3 w-3" />
                {badge}
              </Badge>
            ) : null}
            <Badge variant="secondary" className="text-[10px]">
              {statusName}
            </Badge>
            {occurrenceStyle ? (
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px]",
                  occurrenceStyle.bg,
                  occurrenceStyle.text,
                  occurrenceStyle.border
                )}
              >
                {occurrenceStyle.label}
              </Badge>
            ) : null}
            {task && isTaskOverdue(task, overdueTaskIds) && occurrenceStatus !== "missed" ? (
              <Badge variant="outline" className="border-orange-400/30 bg-orange-500/10 text-[10px] text-orange-800">
                Overdue
              </Badge>
            ) : null}
            {task?.recurrenceSequence ? (
              <Badge variant="outline" className="text-[10px] tabular-nums">
                Run #{task.recurrenceSequence}
              </Badge>
            ) : null}
            {subtaskProgress.total > 0 ? (
              <Badge variant="outline" className="text-[10px] tabular-nums">
                Subtasks {subtaskProgress.completed}/{subtaskProgress.total}
              </Badge>
            ) : null}
            {template?.isPaused ? (
              <Badge variant="outline" className="border-amber-400/30 bg-amber-500/10 text-[10px] text-amber-800">
                Paused
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <section className={cn(EXEC_PLANNER.paperCard, "p-3")}>
            <h3 className={EXEC_PLANNER.sectionLabel}>Recurrence rule</h3>
            <p className="mt-1 text-sm font-medium">{recurrenceRule}</p>
            {template ? (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Generated {template.generatedCount} · Upcoming {template.upcoming}
              </p>
            ) : null}
          </section>

          <section>
            <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              Upcoming runs
            </h3>
            <div className="space-y-2 rounded-xl border border-border/40 bg-background/70 p-3">
              {upcomingRuns.map((item) => (
                <div key={item.label} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-semibold tabular-nums">{item.date}</span>
                </div>
              ))}
              {task?.dueDate ? (
                <div className="flex items-center gap-2 border-t border-border/35 pt-2 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  Due{" "}
                  {new Date(task.dueDate).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                  {task.dueTime
                    ? ` · ${String(task.dueTime).slice(0, 5)}`
                    : ""}
                </div>
              ) : null}
            </div>
          </section>

          <section>
            <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              Assignees
            </h3>
            {assignees.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {assignees.map((a) => (
                  <div
                    key={a.id}
                    className="inline-flex items-center gap-2 rounded-full border border-border/40 bg-background px-2.5 py-1 text-xs"
                  >
                    <UserAvatar userId={a.id} name={a.name} avatarUrl={a.avatarUrl} className="h-6 w-6" />
                    {a.name}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Unassigned</p>
            )}
          </section>

          <RecurringSubtaskChecklist
            task={task}
            taskId={taskId}
            open={open}
            readOnly={readOnly}
            allowAdd
            showWhenEmpty
            boardQueryKey={boardQueryKey}
            onTaskUpdated={onTaskUpdated}
          />

          <section className="flex gap-3">
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-border/40 bg-background/70 px-3 py-2 text-xs">
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-semibold tabular-nums">{activityComments}</span>
              <span className="text-muted-foreground">comments</span>
            </div>
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-border/40 bg-background/70 px-3 py-2 text-xs">
              <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-semibold tabular-nums">{activityAttachments}</span>
              <span className="text-muted-foreground">files</span>
            </div>
          </section>

          <section>
            <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <History className="h-3.5 w-3.5" />
              Run history
            </h3>
            {historyLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            ) : recentHistory.length > 0 ? (
              <ul className="space-y-1.5">
                {recentHistory.map((occ) => (
                  <li
                    key={occ.id}
                    className="flex items-center justify-between rounded-xl border border-border/35 bg-background/60 px-3 py-2 text-xs"
                  >
                    <span>
                      Run #{occ.sequenceNumber}
                      <span className="ml-2 text-muted-foreground">
                        {formatShortDate(occ.dueDate)}
                      </span>
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        occ.state === "COMPLETED" && "border-emerald-400/30 text-emerald-700",
                        occ.state === "SKIPPED" && "border-amber-400/30 text-amber-700",
                        occ.state === "PENDING" && "border-sky-400/30 text-sky-700"
                      )}
                    >
                      {occ.state.toLowerCase()}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No history yet.</p>
            )}
          </section>
        </div>

        <div className="shrink-0 space-y-2 border-t border-border/45 bg-muted/10 p-4">
          {!readOnly && task ? (
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                className="gap-1.5"
                disabled={!canMarkRunDone && subtaskProgress.total > 0}
                onClick={() => onMarkDone?.(task)}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Mark run done
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onSkip?.(task)}>
                <SkipForward className="h-3.5 w-3.5" />
                Skip next run
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onSnooze?.(task)}>
                <AlarmClock className="h-3.5 w-3.5" />
                Snooze
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onPauseSeries?.(task)}>
                <Pause className="h-3.5 w-3.5" />
                Pause
              </Button>
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            {taskId && onOpenFullDetails ? (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => onOpenFullDetails(taskId)}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Edit run details
              </Button>
            ) : null}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
