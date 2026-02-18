"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { Task, WorkflowStatus } from "@/types/api";
import type { BoardPermissions } from "@/hooks/use-board-permissions";
import type { AssigneeMap, SubtaskInfo, TaskCardQuickActions } from "@/components/kanban/kanban-board";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertCircle,
  Archive,
  ArrowRight,
  BookOpen,
  Bug,
  Calendar,
  CheckCircle2,
  CircleDot,
  Clock3,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Rocket,
  SquarePen,
  UserPlus,
  Wrench,
} from "lucide-react";
import { TaskAssigneePopover } from "@/components/tasks/task-assignee-popover";

export type TaskType = "bug" | "feature" | "story" | "improvement";

interface TaskLabel {
  id?: string;
  name: string;
  color?: string;
}

interface TaskAssignee {
  id?: string;
  name: string;
  email?: string;
  avatarUrl?: string;
}

export interface TaskCardTask extends Task {
  type?: TaskType;
  assignees?: TaskAssignee[];
  labels?: TaskLabel[];
  commentsCount?: number;
  attachmentsCount?: number;
  checklistTotal?: number;
  checklistCompleted?: number;
}

const PRIORITY: Record<string, { label: string; dot: string; border: string }> = {
  critical: { label: "Critical", dot: "bg-purple-500", border: "border-purple-500/20" },
  high: { label: "High", dot: "bg-red-500", border: "border-red-500/20" },
  medium: { label: "Medium", dot: "bg-amber-500", border: "border-amber-500/20" },
  low: { label: "Low", dot: "bg-emerald-500", border: "border-emerald-500/20" },
};

function normalizePriority(priority: string) {
  return priority.toLowerCase();
}

function getDueDateTone(dueDate?: string) {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const now = new Date();
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (dueDay < nowDay) return { tone: "overdue", className: "text-red-600 border-red-500/20 bg-red-500/10", icon: AlertCircle };
  if (dueDay === nowDay) return { tone: "today", className: "text-orange-600 border-orange-500/20 bg-orange-500/10", icon: Clock3 };
  return { tone: "future", className: "text-muted-foreground border-border/60 bg-muted/35", icon: Calendar };
}

function TypeIcon({ type }: { type?: TaskType }) {
  const common = "h-3.5 w-3.5 shrink-0";
  if (type === "bug") return <Bug className={cn(common, "text-red-500")} aria-label="Bug" />;
  if (type === "feature") return <Rocket className={cn(common, "text-blue-500")} aria-label="Feature" />;
  if (type === "story") return <BookOpen className={cn(common, "text-violet-500")} aria-label="Story" />;
  if (type === "improvement") return <Wrench className={cn(common, "text-emerald-500")} aria-label="Improvement" />;
  return <CircleDot className={cn(common, "text-muted-foreground/60")} aria-label="Task" />;
}

export function TaskPriorityBadge({ priority }: { priority: string }) {
  const cfg = PRIORITY[normalizePriority(priority)] ?? PRIORITY.medium;
  return (
    <Badge variant="outline" className={cn("h-6 rounded-md gap-1.5 px-2 text-[11px] font-semibold bg-background/75", cfg.border)}>
      <span className={cn("h-2 w-2 rounded-full", cfg.dot)} />
      {cfg.label}
    </Badge>
  );
}

export function TaskLabelGroup({ labels }: { labels: TaskLabel[] }) {
  if (labels.length === 0) return null;
  const visible = labels.slice(0, 2);
  const hidden = labels.length - visible.length;
  return (
    <div className="flex items-center gap-1.5">
      {visible.map((label) => (
        <span
          key={label.id ?? label.name}
          className="inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold"
          style={label.color ? { backgroundColor: `${label.color}22`, borderColor: `${label.color}55`, color: label.color } : undefined}
        >
          {label.name}
        </span>
      ))}
      {hidden > 0 && <span className="text-[10px] font-semibold text-muted-foreground">+{hidden}</span>}
    </div>
  );
}

export function TaskMetaRow({
  commentsCount,
  attachmentsCount,
  checklistCompleted,
  checklistTotal,
}: {
  commentsCount: number;
  attachmentsCount: number;
  checklistCompleted?: number;
  checklistTotal?: number;
}) {
  return (
    <div className="mt-2.5 flex items-center gap-3 text-[11px] text-muted-foreground">
      <span className="inline-flex items-center gap-1" aria-label={`${commentsCount} comments`}>
        <MessageSquare className="h-3.5 w-3.5" />
        {commentsCount}
      </span>
      <span className="inline-flex items-center gap-1" aria-label={`${attachmentsCount} attachments`}>
        <Paperclip className="h-3.5 w-3.5" />
        {attachmentsCount}
      </span>
      {typeof checklistTotal === "number" && checklistTotal > 0 && (
        <span className="inline-flex items-center gap-1" aria-label={`Checklist ${checklistCompleted ?? 0} of ${checklistTotal}`}>
          <CheckCircle2 className="h-3.5 w-3.5" />
          {checklistCompleted ?? 0}/{checklistTotal}
        </span>
      )}
    </div>
  );
}

export function TaskProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="mt-3">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
          aria-label={`Progress ${pct}%`}
        />
      </div>
      <div className="mt-1 text-[10px] font-medium text-muted-foreground tabular-nums">{pct}%</div>
    </div>
  );
}

export function TaskAvatarStack({
  assignees,
  fallbackLabel = "Unassigned",
}: {
  assignees: TaskAssignee[];
  fallbackLabel?: string;
}) {
  if (assignees.length === 0) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Avatar className="h-7 w-7 ring-2 ring-background">
              <AvatarFallback className="text-[9px] font-semibold bg-muted text-muted-foreground">UA</AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent className="text-xs">{fallbackLabel}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const visible = assignees.slice(0, 3);
  const hidden = assignees.length - visible.length;

  return (
    <div className="flex items-center">
      <TooltipProvider delayDuration={200}>
        {visible.map((assignee, index) => (
          <Tooltip key={`${assignee.id ?? assignee.name}-${index}`}>
            <TooltipTrigger asChild>
              <Avatar className={cn("h-7 w-7 ring-2 ring-background shadow-sm", index > 0 && "-ml-2.5")}>
                <AvatarImage src={assignee.avatarUrl} />
                <AvatarFallback className="text-[9px] font-semibold bg-primary/10 text-primary">
                  {assignee.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent className="text-xs">
              {assignee.name}{assignee.email ? ` (${assignee.email})` : ""}
            </TooltipContent>
          </Tooltip>
        ))}
      </TooltipProvider>
      {hidden > 0 && (
        <span className="ml-1 text-[10px] font-semibold text-muted-foreground">+{hidden}</span>
      )}
    </div>
  );
}

interface TaskCardProps {
  task: TaskCardTask;
  isOverlay?: boolean;
  isMoving?: boolean;
  isSelected?: boolean;
  isSelectionMode?: boolean;
  commentCount?: number;
  attachmentCount?: number;
  subtaskInfo?: SubtaskInfo;
  assigneeMap?: AssigneeMap;
  statuses?: WorkflowStatus[];
  quickActions?: TaskCardQuickActions;
  permissions?: BoardPermissions;
  onTaskClick?: (task: Task) => void;
  onToggleSelect?: (taskId: string) => void;
}

export function TaskCard({
  task,
  isOverlay,
  isMoving,
  isSelected,
  isSelectionMode,
  commentCount = 0,
  attachmentCount = 0,
  subtaskInfo,
  assigneeMap,
  statuses,
  quickActions,
  permissions,
  onTaskClick,
  onToggleSelect,
}: TaskCardProps) {
  const readOnly = permissions?.isViewer;
  const dueTone = getDueDateTone(task.dueDate);
  const labels = task.labels ?? (task.sprintId ? [{ id: "sprint", name: "Sprint", color: "#6366f1" }] : []);
  const activityComments = task.commentsCount ?? commentCount;
  const activityAttachments = task.attachmentsCount ?? attachmentCount;

  const initialAssignees: TaskAssignee[] = useMemo(
    () =>
      task.assignees?.length
        ? task.assignees
        : task.assigneeId && assigneeMap?.[task.assigneeId]
          ? [{ id: task.assigneeId, name: assigneeMap[task.assigneeId].name, avatarUrl: assigneeMap[task.assigneeId].avatarUrl }]
          : [],
    [task.assignees, task.assigneeId, assigneeMap]
  );
  const [localAssignees, setLocalAssignees] = useState<TaskAssignee[]>(initialAssignees);
  useEffect(() => {
    setLocalAssignees(initialAssignees);
  }, [initialAssignees]);

  const progressPct = subtaskInfo && subtaskInfo.total > 0
    ? Math.round((subtaskInfo.completed / subtaskInfo.total) * 100)
    : task.checklistTotal && task.checklistTotal > 0
      ? Math.round(((task.checklistCompleted ?? 0) / task.checklistTotal) * 100)
      : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("[data-quick-action]")) return;
        if ((e.target as HTMLElement).closest("[data-bulk-check]")) return;
        if (isSelectionMode && onToggleSelect) return onToggleSelect(task.id);
        onTaskClick?.(task);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onTaskClick?.(task);
        }
      }}
      className={cn(
        "group/card relative overflow-hidden rounded-2xl border bg-gradient-to-b from-card to-card/95 p-4 cursor-pointer",
        "transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2",
        "shadow-[0_1px_2px_rgba(0,0,0,0.08),0_10px_24px_-18px_rgba(0,0,0,0.45)]",
        "hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_10px_28px_-16px_rgba(0,0,0,0.45),0_0_0_1px_rgba(99,102,241,0.14)]",
        isOverlay && "scale-[1.02] shadow-2xl ring-2 ring-primary/40",
        isSelected && "ring-2 ring-primary/70 border-primary/40 bg-primary/[0.04]",
        isMoving && "opacity-70",
        task.id.startsWith("temp-") && "border-dashed",
        readOnly && "cursor-default hover:translate-y-0"
      )}
      data-cy={`task-card-${task.id}`}
      aria-label={`Open task ${task.title}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-white/35 to-transparent dark:from-white/5" />

      {isSelectionMode && (
        <button
          data-bulk-check
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect?.(task.id);
          }}
          className={cn(
            "absolute left-2.5 top-2.5 z-20 flex h-5 w-5 items-center justify-center rounded border-2 transition-all",
            isSelected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30 bg-background"
          )}
          aria-label={isSelected ? "Deselect task" : "Select task"}
        >
          {isSelected && <CheckCircle2 className="h-3 w-3" />}
        </button>
      )}

      {!readOnly && !isSelectionMode && (
        <div className="absolute right-2.5 top-2.5 z-20 flex items-center gap-1 opacity-0 transition-opacity duration-150 group-hover/card:opacity-100">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-7 w-7 rounded-lg bg-card/90"
            data-quick-action
            aria-label="Edit task"
            onClick={(e) => {
              e.stopPropagation();
              quickActions?.onEdit?.(task);
            }}
          >
            <SquarePen className="h-3.5 w-3.5" />
          </Button>
          <TaskAssigneePopover
            task={{ id: task.id, projectId: task.projectId, assigneeId: task.assigneeId, assignees: localAssignees }}
            onAssigneesChange={setLocalAssignees}
            trigger={
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-7 w-7 rounded-lg bg-card/90"
                data-quick-action
                aria-label="Assign task"
                onClick={(e) => e.stopPropagation()}
              >
                <UserPlus className="h-3.5 w-3.5" />
              </Button>
            }
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-7 w-7 rounded-lg bg-card/90"
            data-quick-action
            aria-label="Change due date"
            onClick={(e) => {
              e.stopPropagation();
              quickActions?.onEdit?.(task);
            }}
          >
            <Calendar className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-7 w-7 rounded-lg bg-card/90"
            data-quick-action
            aria-label="Archive task"
            onClick={(e) => {
              e.stopPropagation();
              quickActions?.onDelete?.(task);
            }}
          >
            <Archive className="h-3.5 w-3.5" />
          </Button>
          {!!quickActions?.onChangeStatus && statuses && statuses.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 rounded-lg bg-card/90"
                  data-quick-action
                  aria-label="More task actions"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel className="text-xs">Move to</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {statuses.filter((s) => s.id !== task.statusId).map((s) => (
                  <DropdownMenuItem
                    key={s.id}
                    onClick={() => quickActions.onChangeStatus?.(task, s.id)}
                    className="text-xs"
                  >
                    <ArrowRight className="mr-2 h-3.5 w-3.5" />
                    {s.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}

      {isMoving && (
        <div className="absolute inset-0 z-30 flex items-center justify-center rounded-2xl bg-card/80">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      <div className={cn(isSelectionMode && "pl-7")}>
        <div className="mb-2 flex items-center gap-2">
          <TypeIcon type={task.type} />
          <span className="inline-flex rounded-md bg-muted/40 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground/70">
            #{task.id.slice(0, 4).toUpperCase()}
          </span>
        </div>

        <p className="line-clamp-2 text-[15px] font-semibold leading-snug tracking-[-0.01em]">
          {task.title}
        </p>

        {task.description && (
          <p className="mt-1.5 line-clamp-1 text-xs leading-relaxed text-muted-foreground/90">
            {task.description}
          </p>
        )}

        <div className="mt-2.5 flex items-center gap-2 flex-wrap">
          <TaskPriorityBadge priority={task.priority} />
          {dueTone && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold", dueTone.className)}>
                    <dueTone.icon className="h-3 w-3" />
                    {new Date(task.dueDate!).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                </TooltipTrigger>
                <TooltipContent className="text-xs">
                  {new Date(task.dueDate!).toLocaleString()}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        <div className="mt-2.5">
          <TaskLabelGroup labels={labels} />
        </div>

        <TaskMetaRow
          commentsCount={activityComments}
          attachmentsCount={activityAttachments}
          checklistCompleted={task.checklistCompleted}
          checklistTotal={task.checklistTotal}
        />

        <div className="mt-3 flex items-center justify-end">
          <TaskAssigneePopover
            task={{ id: task.id, projectId: task.projectId, assigneeId: task.assigneeId, assignees: localAssignees }}
            onAssigneesChange={setLocalAssignees}
            trigger={
              <button
                type="button"
                data-quick-action
                className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
                aria-label="Change assignee"
                onClick={(e) => e.stopPropagation()}
              >
                <TaskAvatarStack assignees={localAssignees} />
              </button>
            }
          />
        </div>

        {typeof progressPct === "number" && <TaskProgressBar value={progressPct} />}
      </div>
    </div>
  );
}

