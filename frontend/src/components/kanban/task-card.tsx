"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { Task, WorkflowStatus } from "@/types/api";
import type { BoardPermissions } from "@/hooks/use-board-permissions";
import type { AssigneeMap, SubtaskInfo, TaskCardQuickActions } from "@/components/kanban/kanban-board";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

/** Minimal priority chip + subtle left accent (enterprise SaaS, calm palette). */
const PRIORITY: Record<
  string,
  {
    label: string;
    dot: string;
    badgeBg: string;
    badgeText: string;
    accentBar: string;
  }
> = {
  critical: {
    label: "Critical",
    dot: "bg-violet-600 dark:bg-violet-400",
    badgeBg: "bg-violet-500/[0.09]",
    badgeText: "text-violet-900 dark:text-violet-100",
    accentBar: "bg-violet-500/55 dark:bg-violet-400/45",
  },
  high: {
    label: "High",
    dot: "bg-rose-500 dark:bg-rose-400",
    badgeBg: "bg-rose-500/[0.09]",
    badgeText: "text-rose-900 dark:text-rose-100",
    accentBar: "bg-rose-500/50 dark:bg-rose-400/40",
  },
  medium: {
    label: "Medium",
    dot: "bg-amber-500 dark:bg-amber-400",
    badgeBg: "bg-amber-500/[0.14]",
    badgeText: "text-amber-950 dark:text-amber-50",
    accentBar: "bg-amber-400/60 dark:bg-amber-400/45",
  },
  low: {
    label: "Low",
    dot: "bg-emerald-500 dark:bg-emerald-400",
    badgeBg: "bg-emerald-500/[0.09]",
    badgeText: "text-emerald-900 dark:text-emerald-100",
    accentBar: "bg-emerald-500/45 dark:bg-emerald-400/35",
  },
};

function normalizePriority(priority: string) {
  return priority.toLowerCase();
}

/**
 * Maps workflow column → accent color (matches default seed: To Do / In Progress / Done).
 * Order: Done → In progress → To do → everything else uses priority rail on the card.
 */
function normalizeWorkflowStatusName(name: string): string {
  return name.replace(/\s+/g, " ").trim().toLowerCase();
}

export function getWorkflowStatusCategory(
  status: WorkflowStatus | undefined
): "todo" | "in_progress" | "done" | "default" {
  if (!status) return "default";
  const type = (status.type || "").toUpperCase().trim();
  const nameLo = normalizeWorkflowStatusName(status.name);
  if (type === "DONE" || nameLo === "done") return "done";
  if (type === "IN_PROGRESS" || nameLo.includes("progress")) return "in_progress";
  if (
    type === "TODO" ||
    type === "BACKLOG" ||
    nameLo === "to do" ||
    nameLo === "to-do" ||
    nameLo === "todo" ||
    nameLo === "backlog"
  ) {
    return "todo";
  }
  return "default";
}

const STATUS_LANE_ACCENT = {
  todo: "bg-sky-600/75 dark:bg-sky-500/65",
  done: "bg-emerald-500/70 dark:bg-emerald-400/60",
  in_progress: "bg-orange-500/70 dark:bg-orange-400/55",
} as const;

const STATUS_BULB = {
  todo: "bg-sky-600 ring-2 ring-sky-500/30 dark:bg-sky-400 dark:ring-sky-400/35",
  done: "bg-emerald-500 ring-2 ring-emerald-500/25 dark:bg-emerald-400 dark:ring-emerald-400/30",
  in_progress: "bg-orange-500 ring-2 ring-orange-500/25 dark:bg-orange-400 dark:ring-orange-400/30",
} as const;

function getDueDateTone(dueDate?: string) {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const now = new Date();
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (dueDay < nowDay)
    return { tone: "overdue", className: "text-rose-700 bg-rose-500/[0.06] dark:text-rose-300", icon: AlertCircle };
  if (dueDay === nowDay)
    return { tone: "today", className: "text-amber-800 bg-amber-500/[0.08] dark:text-amber-200", icon: Clock3 };
  return { tone: "future", className: "text-neutral-500 bg-neutral-500/[0.06] dark:text-neutral-400 dark:bg-white/5", icon: Calendar };
}

function TypeIcon({ type }: { type?: TaskType }) {
  const common = "h-3.5 w-3.5 shrink-0 opacity-80";
  if (type === "bug") return <Bug className={cn(common, "text-rose-600 dark:text-rose-400")} aria-label="Bug" />;
  if (type === "feature") return <Rocket className={cn(common, "text-sky-600 dark:text-sky-400")} aria-label="Feature" />;
  if (type === "story") return <BookOpen className={cn(common, "text-violet-600 dark:text-violet-400")} aria-label="Story" />;
  if (type === "improvement") return <Wrench className={cn(common, "text-emerald-600 dark:text-emerald-400")} aria-label="Improvement" />;
  return <CircleDot className={cn(common, "text-neutral-400 dark:text-neutral-500")} aria-label="Task" />;
}

export function TaskPriorityBadge({ priority }: { priority: string }) {
  const cfg = PRIORITY[normalizePriority(priority)] ?? PRIORITY.medium;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium leading-none tracking-tight",
        cfg.badgeBg,
        cfg.badgeText
      )}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", cfg.dot)} aria-hidden />
      {cfg.label}
    </span>
  );
}

export function TaskLabelGroup({ labels }: { labels: TaskLabel[] }) {
  if (labels.length === 0) return null;
  const visible = labels.slice(0, 2);
  const hidden = labels.length - visible.length;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {visible.map((label) => (
        <span
          key={label.id ?? label.name}
          className="inline-flex items-center rounded-md border border-neutral-200/90 bg-neutral-50 px-2 py-0.5 text-[10px] font-medium text-neutral-700 dark:border-border dark:bg-muted/40 dark:text-neutral-200"
          style={label.color ? { backgroundColor: `${label.color}18`, borderColor: `${label.color}40`, color: label.color } : undefined}
        >
          {label.name}
        </span>
      ))}
      {hidden > 0 && <span className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500">+{hidden}</span>}
    </div>
  );
}

export function TaskMetaRow({
  commentsCount,
  attachmentsCount,
  checklistCompleted,
  checklistTotal,
  className,
}: {
  commentsCount: number;
  attachmentsCount: number;
  checklistCompleted?: number;
  checklistTotal?: number;
  className?: string;
}) {
  const iconClass = "h-3.5 w-3.5 text-neutral-400 dark:text-neutral-500";
  return (
    <div className={cn("flex items-center gap-3.5 text-[11px] font-medium tabular-nums text-neutral-500 dark:text-neutral-400", className)}>
      <span className="inline-flex items-center gap-1.5" aria-label={`${commentsCount} comments`}>
        <MessageSquare className={iconClass} strokeWidth={2} />
        {commentsCount}
      </span>
      <span className="inline-flex items-center gap-1.5" aria-label={`${attachmentsCount} attachments`}>
        <Paperclip className={iconClass} strokeWidth={2} />
        {attachmentsCount}
      </span>
      {typeof checklistTotal === "number" && checklistTotal > 0 && (
        <span className="inline-flex items-center gap-1.5" aria-label={`Checklist ${checklistCompleted ?? 0} of ${checklistTotal}`}>
          <CheckCircle2 className={iconClass} strokeWidth={2} />
          {checklistCompleted ?? 0}/{checklistTotal}
        </span>
      )}
    </div>
  );
}

export function TaskProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="mt-4">
      <div className="h-1 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-white/10">
        <div
          className="h-full rounded-full bg-primary/80 transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
          aria-label={`Progress ${pct}%`}
        />
      </div>
      <div className="mt-1.5 text-[10px] font-medium tabular-nums text-neutral-400 dark:text-neutral-500">{pct}%</div>
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
            <Avatar className="h-8 w-8 ring-2 ring-white dark:ring-card">
              <AvatarFallback className="text-[9px] font-medium tracking-tight bg-neutral-100 text-neutral-500 dark:bg-muted dark:text-neutral-400">
                UA
              </AvatarFallback>
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
    <div className="flex items-center justify-end">
      <TooltipProvider delayDuration={200}>
        {visible.map((assignee, index) => (
          <Tooltip key={`${assignee.id ?? assignee.name}-${index}`}>
            <TooltipTrigger asChild>
              <Avatar
                className={cn(
                  "h-8 w-8 ring-2 ring-white shadow-sm dark:ring-card",
                  index > 0 && "-ml-2.5"
                )}
              >
                <AvatarImage src={assignee.avatarUrl} alt="" />
                <AvatarFallback className="text-[10px] font-medium tracking-tight bg-violet-100 text-violet-700 dark:bg-primary/15 dark:text-primary">
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
        <span className="ml-1.5 text-[10px] font-medium text-neutral-400 dark:text-neutral-500">+{hidden}</span>
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
  /** Column the card is rendered in — used for lane color when API/task id lookup is unreliable */
  boardColumnStatus?: WorkflowStatus;
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
  boardColumnStatus,
  quickActions,
  permissions,
  onTaskClick,
  onToggleSelect,
}: TaskCardProps) {
  const readOnly = !permissions?.canEditTask;
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

  const prioCfg = PRIORITY[normalizePriority(task.priority)] ?? PRIORITY.medium;
  const statusForLane =
    boardColumnStatus ?? statuses?.find((s) => s.id === task.statusId);
  const statusCategory = getWorkflowStatusCategory(statusForLane);
  const leftAccentClass =
    statusCategory === "todo"
      ? STATUS_LANE_ACCENT.todo
      : statusCategory === "done"
        ? STATUS_LANE_ACCENT.done
        : statusCategory === "in_progress"
          ? STATUS_LANE_ACCENT.in_progress
          : prioCfg.accentBar;
  const statusBulbClass =
    statusCategory === "todo"
      ? STATUS_BULB.todo
      : statusCategory === "done"
        ? STATUS_BULB.done
        : statusCategory === "in_progress"
          ? STATUS_BULB.in_progress
          : "bg-neutral-300 ring-2 ring-neutral-200/80 dark:bg-neutral-600 dark:ring-neutral-500/40";

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
        "group/card relative cursor-pointer overflow-hidden rounded-2xl border border-[#E7EAF0] bg-[#FCFCFD]",
        "dark:border-border dark:bg-card",
        /* Soft layered shadow — calm depth without harsh contrast */
        "shadow-[0_1px_2px_rgba(15,23,42,0.035),0_6px_20px_-4px_rgba(15,23,42,0.055)]",
        "transition-[box-shadow,transform,border-color,background-color] duration-200 ease-out",
        /* Hover: brighten toward white + slightly deeper shadow (enterprise polish) */
        "hover:-translate-y-0.5 hover:bg-white hover:border-[#E2E6ED]",
        "hover:shadow-[0_2px_4px_rgba(15,23,42,0.045),0_10px_28px_-6px_rgba(15,23,42,0.085)]",
        "dark:hover:border-neutral-600 dark:hover:bg-neutral-800/90",
        "dark:hover:shadow-[0_4px_24px_-6px_rgba(0,0,0,0.38)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-2",
        isOverlay && "scale-[1.02] shadow-xl ring-2 ring-primary/30",
        isSelected && "border-primary/30 bg-violet-50/40 ring-2 ring-primary/25 dark:bg-primary/[0.06]",
        isMoving && "opacity-65",
        task.id.startsWith("temp-") && "border-dashed",
        readOnly &&
          "cursor-default hover:translate-y-0 hover:border-[#E7EAF0] hover:bg-[#FCFCFD] dark:hover:bg-card hover:shadow-[0_1px_2px_rgba(15,23,42,0.035),0_6px_20px_-4px_rgba(15,23,42,0.055)]"
      )}
      data-cy={`task-card-${task.id}`}
      aria-label={`Open task ${task.title}`}
    >
      {/* Column: To do = blue, In progress = orange, Done = green; other columns use priority accent */}
      <span
        className={cn("pointer-events-none absolute left-0 top-3 bottom-3 w-[3px] rounded-full", leftAccentClass)}
        aria-hidden
      />

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
        <div className="absolute right-3 top-3 z-20 flex items-center gap-0.5 opacity-0 transition-opacity duration-200 group-hover/card:opacity-100">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-7 w-7 rounded-lg border-[#E7EAF0] bg-[#FCFCFD]/95 shadow-sm hover:bg-white dark:border-border dark:bg-card/95"
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
                className="h-7 w-7 rounded-lg border-[#E7EAF0] bg-[#FCFCFD]/95 shadow-sm hover:bg-white dark:border-border dark:bg-card/95"
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
            className="h-7 w-7 rounded-lg border-[#E7EAF0] bg-[#FCFCFD]/95 shadow-sm hover:bg-white dark:border-border dark:bg-card/95"
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
            className="h-7 w-7 rounded-lg border-[#E7EAF0] bg-[#FCFCFD]/95 shadow-sm hover:bg-white dark:border-border dark:bg-card/95"
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
                  className="h-7 w-7 rounded-lg border-[#E7EAF0] bg-[#FCFCFD]/95 shadow-sm hover:bg-white dark:border-border dark:bg-card/95"
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
        <div className="absolute inset-0 z-30 flex items-center justify-center rounded-2xl bg-[#FCFCFD]/80 backdrop-blur-[2px] dark:bg-card/80">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary/40 border-t-primary" />
        </div>
      )}

      <div className={cn("px-4 pb-4 pt-3.5 pl-[18px]", isSelectionMode && "pl-8")}>
        {/* Status bulb + ID + type — To do blue, In progress orange, Done green */}
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span
              role="img"
              aria-label={
                statusCategory === "todo"
                  ? "Column status: To do"
                  : statusCategory === "done"
                    ? "Column status: Done"
                    : statusCategory === "in_progress"
                      ? "Column status: In progress"
                      : "Column status: Other"
              }
              className={cn("h-2 w-2 shrink-0 rounded-full", statusBulbClass)}
            />
            <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              #{task.id.slice(0, 4).toUpperCase()}
            </span>
          </div>
          <TypeIcon type={task.type} />
        </div>

        <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug tracking-[-0.015em] text-neutral-900 dark:text-neutral-100">
          {task.title}
        </h3>

        {task.description && (
          <p className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-neutral-500 dark:text-neutral-400">
            {task.description}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <TaskPriorityBadge priority={task.priority} />
          {dueTone && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                      dueTone.className
                    )}
                  >
                    <dueTone.icon className="h-3 w-3 shrink-0 opacity-80" strokeWidth={2} />
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

        {labels.length > 0 && (
          <div className="mt-3">
            <TaskLabelGroup labels={labels} />
          </div>
        )}

        <div className="mt-4 flex items-end justify-between gap-3 border-t border-[#EEF0F5] pt-3 dark:border-white/[0.06]">
          <TaskMetaRow
            commentsCount={activityComments}
            attachmentsCount={activityAttachments}
            checklistCompleted={task.checklistCompleted}
            checklistTotal={task.checklistTotal}
            className="min-w-0 flex-1"
          />
          <TaskAssigneePopover
            task={{ id: task.id, projectId: task.projectId, assigneeId: task.assigneeId, assignees: localAssignees }}
            onAssigneesChange={setLocalAssignees}
            trigger={
              <button
                type="button"
                data-quick-action
                className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-2"
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

