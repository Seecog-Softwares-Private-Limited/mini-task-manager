"use client";

import { cn } from "@/lib/utils";
import {
  getRecurringOccurrenceStatus,
  OCCURRENCE_STATUS_STYLES,
} from "@/lib/recurring-board-filters";
import {
  formatRecurringScheduleLine,
  recurrenceBadgeLabel,
} from "@/lib/recurring-board-utils";
import { EXEC_PLANNER } from "@/lib/executive-planner-theme";
import { getRecurringCardTheme } from "@/lib/recurring-card-theme";
import { TaskAvatarStack } from "@/components/kanban/task-card";
import { getOccurrenceSubtaskProgress } from "@/lib/recurring-subtask-utils";
import type { AssigneeMap, SubtaskInfo } from "@/components/kanban/kanban-board";
import type { Task, RecurringTemplateSummary, WorkflowStatus } from "@/types/api";
import {
  AlarmClock,
  ArrowUpRight,
  CheckCircle2,
  SkipForward,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface PlannerEntryCardProps {
  task: Task;
  template?: RecurringTemplateSummary;
  statuses: WorkflowStatus[];
  overdueTaskIds: string[];
  assigneeMap?: AssigneeMap;
  subtaskInfo?: SubtaskInfo;
  commentCount?: number;
  readOnly?: boolean;
  onOpen?: (task: Task) => void;
  onMarkDone?: (task: Task) => void;
  onSkip?: (task: Task) => void;
  onSnooze?: (task: Task) => void;
  className?: string;
}

export function PlannerEntryCard({
  task,
  template,
  statuses,
  overdueTaskIds,
  assigneeMap,
  subtaskInfo,
  commentCount = 0,
  readOnly,
  onOpen,
  onMarkDone,
  onSkip,
  onSnooze,
  className,
}: PlannerEntryCardProps) {
  const status = getRecurringOccurrenceStatus(task, overdueTaskIds, statuses);
  const statusStyle = OCCURRENCE_STATUS_STYLES[status];
  const theme = getRecurringCardTheme(template?.repeatType ?? task.recurrenceType);
  const badge = recurrenceBadgeLabel(task);
  const schedule = formatRecurringScheduleLine(task, template);
  const seriesName = template?.title ?? task.title;

  const progressFromTask = getOccurrenceSubtaskProgress(task.subtasks);
  const checklistTotal = subtaskInfo?.total ?? progressFromTask.total;
  const checklistCompleted = subtaskInfo?.completed ?? progressFromTask.completed;
  const progress =
    checklistTotal > 0 ? Math.round((checklistCompleted / checklistTotal) * 100) : 0;

  const assigneeIds = task.assigneeIds?.length
    ? task.assigneeIds
    : task.assigneeId
      ? [task.assigneeId]
      : [];
  const assignees = assigneeIds.map((id) => ({
    id,
    name: assigneeMap?.[id]?.name ?? task.assignee?.fullName ?? "User",
    avatarUrl: assigneeMap?.[id]?.avatarUrl ?? task.assignee?.avatarUrl,
  }));

  const isDone = status === "done";
  const canMarkDone = checklistTotal === 0 || checklistCompleted === checklistTotal;

  return (
    <article
      className={cn(
        EXEC_PLANNER.entryCard,
        "relative overflow-hidden",
        isDone && "opacity-80",
        className
      )}
    >
      <div className={cn("absolute inset-y-0 left-0 w-1", theme.rail)} />
      {isDone ? (
        <div className="pointer-events-none absolute right-3 top-3 rotate-[-12deg] rounded border-2 border-emerald-500/40 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-600/70">
          Done
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => onOpen?.(task)}
        className="flex w-full flex-col gap-2 px-3.5 py-3 pl-4 text-left"
      >
        <div className="flex items-start justify-between gap-2 pr-8">
          <div className="min-w-0 flex-1">
            <p className="line-clamp-1 text-[10px] font-medium text-muted-foreground">{seriesName}</p>
            <h3 className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug">{task.title}</h3>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
              statusStyle.bg,
              statusStyle.text,
              statusStyle.border
            )}
          >
            {statusStyle.label}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {badge ? (
            <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-medium border", theme.ribbon)}>
              {badge}
            </span>
          ) : null}
          {schedule ? (
            <span className="text-[10px] text-muted-foreground">{schedule}</span>
          ) : null}
          {commentCount > 0 ? (
            <span className="text-[10px] text-muted-foreground">{commentCount} comments</span>
          ) : null}
        </div>

        {checklistTotal > 0 ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Subtasks</span>
              <span className="tabular-nums">
                {checklistCompleted}/{checklistTotal}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted/60">
              <div
                className="h-full rounded-full bg-primary/70 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-2 pt-0.5">
          <TaskAvatarStack assignees={assignees} />
        </div>
      </button>

      {!readOnly && !isDone ? (
        <div className="flex border-t border-border/35 bg-muted/10 opacity-0 transition-opacity group-hover/entry:opacity-100 focus-within:opacity-100">
          {onMarkDone ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 flex-1 gap-1 rounded-none text-[10px] font-semibold"
              disabled={!canMarkDone}
              title={
                canMarkDone
                  ? "Mark done"
                  : "Finish all subtasks before marking this run done"
              }
              onClick={(e) => {
                e.stopPropagation();
                if (!canMarkDone) return;
                onMarkDone(task);
              }}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Done
            </Button>
          ) : null}
          {onSnooze ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 flex-1 gap-1 rounded-none text-[10px] font-semibold"
              onClick={(e) => {
                e.stopPropagation();
                onSnooze(task);
              }}
            >
              <AlarmClock className="h-3.5 w-3.5" />
              Snooze
            </Button>
          ) : null}
          {onSkip ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 flex-1 gap-1 rounded-none text-[10px] font-semibold"
              onClick={(e) => {
                e.stopPropagation();
                onSkip(task);
              }}
            >
              <SkipForward className="h-3.5 w-3.5" />
              Skip next
            </Button>
          ) : null}
          {onOpen ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 flex-1 gap-1 rounded-none text-[10px] font-semibold"
              onClick={(e) => {
                e.stopPropagation();
                onOpen(task);
              }}
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
              Details
            </Button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
