"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { stripHtmlToPlainText } from "@/lib/project-description-plain";
import {
  APP_CHIP_BASE,
  APP_CHIP_ICON,
  TASK_CARD_DESCRIPTION,
  TASK_CARD_TITLE,
  TASK_CARD_TITLE_DONE,
} from "@/lib/ui/design-tokens";
import type { Task, WorkflowStatus, RecurringTemplateSummary } from "@/types/api";
import type { BoardPermissions } from "@/hooks/use-board-permissions";
import type { AssigneeMap, SubtaskInfo, TaskCardQuickActions } from "@/components/kanban/kanban-board";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserAvatar } from "@/components/ui/user-avatar";
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
  ArrowRight,
  ArrowUpRight,
  Ban,
  BookOpen,
  Bug,
  Calendar,
  CheckCircle2,
  Clock3,
  Code2,
  Link2,
  ListChecks,
  MessageSquare,
  Monitor,
  MoreHorizontal,
  Paperclip,
  Repeat,
  Rocket,
  SkipForward,
  SquarePen,
  Trash2,
  UserPlus,
  Wrench,
  Pause,
  AlarmClock,
} from "lucide-react";
import { TaskAssigneePopover } from "@/components/tasks/task-assignee-popover";
import {
  canUserDeleteTask,
  canUserEditTaskFully,
  isUserAssignedToTask,
} from "@/lib/task-assignees";
import {
  isRecurringTask,
  recurrenceCadenceShort,
  recurrenceRibbonLabel,
} from "@/lib/recurrence-display";
import {
  formatRecurringScheduleLine,
  getRecurringMissedTone,
  recurrenceBadgeLabel,
} from "@/lib/recurring-board-utils";
import { cadenceBarClass, RECURRING_OVERDUE_COLUMN_ID } from "@/lib/recurring-board-constants";
import {
  getRecurringCardTheme,
  recurringCardMissedBadge,
  recurringCardOverdueSurface,
} from "@/lib/recurring-card-theme";

export type TaskType =
  | "bug"
  | "feature"
  | "story"
  | "improvement"
  | "ui"
  | "backend"
  | "recurring";

const TYPE_TAG_NAMES = new Set([
  "bug",
  "feature",
  "story",
  "improvement",
  "ui",
  "backend",
]);

const BLOCKED_TAG_NAMES = new Set(["blocked", "blocker"]);

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
  todo: "bg-rose-500/90 dark:bg-rose-400/80",
  done: "bg-emerald-500/75 dark:bg-emerald-400/65",
  in_progress: "bg-amber-500/85 dark:bg-amber-400/70",
} as const;

const STATUS_BULB = {
  todo: "bg-rose-500 ring-1 ring-rose-500/25 dark:bg-rose-400",
  done: "bg-emerald-500 ring-1 ring-emerald-500/20 dark:bg-emerald-400",
  in_progress: "bg-amber-500 ring-1 ring-amber-500/20 dark:bg-amber-400",
} as const;

/** Neutral card surface — accent bar carries status color; minimal lane tint. */
const STATUS_CARD_SURFACE = {
  todo: cn(
    "border-slate-200/70 bg-white dark:border-border/55 dark:bg-card",
    "hover:border-slate-300/75 hover:shadow-[0_2px_10px_-4px_rgba(15,23,42,0.08)]",
    "dark:hover:border-border/70"
  ),
  in_progress: cn(
    "border-slate-200/70 bg-white dark:border-border/55 dark:bg-card",
    "hover:border-slate-300/75 hover:shadow-[0_2px_10px_-4px_rgba(15,23,42,0.08)]",
    "dark:hover:border-border/70"
  ),
  done: cn(
    "border-slate-200/50 bg-slate-50/40 dark:border-border/40 dark:bg-card/75",
    "opacity-[0.84] saturate-[0.92]",
    "hover:border-slate-200/60 hover:shadow-[0_1px_6px_-3px_rgba(15,23,42,0.05)]"
  ),
  default: cn(
    "border-slate-200/70 bg-white dark:border-border/55 dark:bg-card",
    "hover:border-slate-300/75 hover:shadow-[0_2px_10px_-4px_rgba(15,23,42,0.08)]"
  ),
} as const;

const QUICK_ACTION_BTN = cn(
  "h-6 w-6 rounded-md border border-border/55 bg-background/95 shadow-sm",
  "transition-all duration-200",
  "hover:border-violet-300/40 hover:bg-white hover:shadow-sm",
  "dark:bg-card/95 dark:hover:bg-card"
);

const EXEC_RECURRING_ACTIONS = cn(
  "absolute inset-x-0 bottom-0 z-20 flex items-center justify-between gap-1 border-t border-border/40 bg-background/95 px-2 py-1.5 backdrop-blur-md",
  "translate-y-full opacity-0 transition-all duration-300",
  "group-hover/card:translate-y-0 group-hover/card:opacity-100",
  "group-focus-within/card:translate-y-0 group-focus-within/card:opacity-100"
);

const QUICK_ACTIONS_BAR = cn(
  "absolute right-1.5 top-1.5 z-20 flex items-center gap-px rounded-md border border-border/45 bg-background/92 p-px shadow-sm backdrop-blur-sm",
  "pointer-events-none opacity-0 transition-all duration-200",
  "group-hover/card:pointer-events-auto group-hover/card:opacity-100",
  "group-focus-within/card:pointer-events-auto group-focus-within/card:opacity-100",
  "dark:bg-card/92"
);

function getDueDateTone(dueDate?: string, isCompleted = false) {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const now = new Date();
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (isCompleted) {
    return {
      tone: "completed",
      label: due.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      className:
        "text-emerald-700/80 bg-emerald-500/[0.08] ring-1 ring-emerald-500/12 dark:text-emerald-300 dark:bg-emerald-500/10",
      icon: CheckCircle2,
    };
  }
  if (dueDay < nowDay) {
    const daysOverdue = Math.floor((nowDay - dueDay) / (24 * 60 * 60 * 1000));
    const critical = daysOverdue >= 7;
    return {
      tone: critical ? "overdue-critical" : "overdue",
      label: due.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      className: critical
        ? "text-rose-800 bg-rose-500/[0.14] ring-1 ring-rose-500/25 dark:text-rose-200 dark:bg-rose-500/15"
        : "text-rose-700/85 bg-rose-500/[0.07] ring-1 ring-rose-500/12 dark:text-rose-300/90 dark:bg-rose-500/10",
      icon: AlertCircle,
    };
  }
  if (dueDay === nowDay) {
    return {
      tone: "today",
      label: "Today",
      className: "text-amber-800/90 bg-amber-500/[0.1] ring-1 ring-amber-500/12 dark:text-amber-100",
      icon: Clock3,
    };
  }
  return {
    tone: "future",
    label: due.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    className: "text-neutral-600 bg-neutral-500/[0.06] dark:text-neutral-300 dark:bg-white/5",
    icon: Calendar,
  };
}

const TASK_TYPE_META: Record<
  TaskType,
  { label: string; icon: React.ComponentType<{ className?: string }>; className: string }
> = {
  bug: {
    label: "Bug",
    icon: Bug,
    className:
      "border-rose-200/80 bg-rose-500/[0.08] text-rose-800 dark:border-rose-500/30 dark:text-rose-200",
  },
  feature: {
    label: "Feature",
    icon: Rocket,
    className:
      "border-sky-200/80 bg-sky-500/[0.08] text-sky-800 dark:border-sky-500/30 dark:text-sky-200",
  },
  story: {
    label: "Story",
    icon: BookOpen,
    className:
      "border-violet-200/80 bg-violet-500/[0.08] text-violet-800 dark:border-violet-500/30 dark:text-violet-200",
  },
  improvement: {
    label: "Improvement",
    icon: Wrench,
    className:
      "border-emerald-200/80 bg-emerald-500/[0.08] text-emerald-800 dark:border-emerald-500/30 dark:text-emerald-200",
  },
  ui: {
    label: "UI",
    icon: Monitor,
    className:
      "border-fuchsia-200/80 bg-fuchsia-500/[0.08] text-fuchsia-800 dark:border-fuchsia-500/30 dark:text-fuchsia-200",
  },
  backend: {
    label: "Backend",
    icon: Code2,
    className:
      "border-slate-200/80 bg-slate-500/[0.08] text-slate-800 dark:border-slate-500/30 dark:text-slate-200",
  },
  recurring: {
    label: "Recurring",
    icon: Repeat,
    className:
      "border-indigo-200/80 bg-indigo-500/[0.08] text-indigo-800 dark:border-indigo-500/30 dark:text-indigo-200",
  },
};

function inferTaskType(task: TaskCardTask): TaskType | null {
  if (task.type) return task.type;
  for (const tag of task.tags ?? task.labels ?? []) {
    const key = tag.name.trim().toLowerCase();
    if (key === "recurring") return "recurring";
    if (TYPE_TAG_NAMES.has(key)) return key as TaskType;
  }
  return null;
}

function partitionTaskTags(tags: TaskLabel[]) {
  let typeTag: TaskType | null = null;
  let blocked = false;
  const labels: TaskLabel[] = [];

  for (const tag of tags) {
    const key = tag.name.trim().toLowerCase();
    if (!typeTag && (TYPE_TAG_NAMES.has(key) || key === "recurring")) {
      typeTag = key as TaskType;
      continue;
    }
    if (BLOCKED_TAG_NAMES.has(key)) {
      blocked = true;
      continue;
    }
    labels.push(tag);
  }

  return { typeTag, blocked, labels };
}

function getActivityLine(task: TaskCardTask): string | null {
  if (!task.updatedAt) return null;
  const updated = new Date(task.updatedAt);
  const created = new Date(task.createdAt);
  if (Number.isNaN(updated.getTime())) return null;

  const now = new Date();
  const isToday =
    updated.getFullYear() === now.getFullYear() &&
    updated.getMonth() === now.getMonth() &&
    updated.getDate() === now.getDate();
  const wasUpdatedAfterCreate = updated.getTime() - created.getTime() > 60_000;

  if (isToday && wasUpdatedAfterCreate) return "Moved today";

  const relative = formatRelativeTime(task.updatedAt);
  return relative ? `Updated ${relative}` : null;
}

function TaskTypeBadge({ type }: { type: TaskType }) {
  const meta = TASK_TYPE_META[type];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide backdrop-blur-sm",
        meta.className
      )}
    >
      <Icon className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
      {meta.label}
    </span>
  );
}

function SubtaskProgressInline({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  if (total <= 0) return null;
  const pct = Math.round((completed / total) * 100);
  return (
    <div className="mt-1.5 space-y-0.5">
      <div className="flex items-center justify-between gap-2 text-[10px] font-medium tabular-nums text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <ListChecks className="h-2.5 w-2.5 opacity-70" aria-hidden />
          Subtasks
        </span>
        <span>
          {completed}/{total}
        </span>
      </div>
      <div
        className="h-0.5 w-full overflow-hidden rounded-full bg-muted/70"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${completed} of ${total} subtasks complete`}
      >
        <div
          className="h-full rounded-full bg-violet-500/70 transition-[width] duration-300 ease-out dark:bg-violet-400/60"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function TaskPriorityBadge({ priority }: { priority: string }) {
  const cfg = PRIORITY[normalizePriority(priority)] ?? PRIORITY.medium;
  return (
    <span
      className={cn(
        APP_CHIP_BASE,
        "gap-1 rounded-md border-transparent px-1.5 text-[10px] font-semibold tracking-tight",
        cfg.badgeBg,
        cfg.badgeText
      )}
    >
      <span className={cn("h-1 w-1 shrink-0 rounded-full", cfg.dot)} aria-hidden />
      {cfg.label}
    </span>
  );
}

const SERIES_CARD_CHROME = cn(
  "ring-1 ring-indigo-400/15 dark:ring-indigo-400/10"
);

export function TaskLabelGroup({ labels }: { labels: TaskLabel[] }) {
  if (labels.length === 0) return null;
  const visible = labels.slice(0, 2);
  const hidden = labels.length - visible.length;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {visible.map((label) => (
        <span
          key={label.id ?? label.name}
          className={cn(
            APP_CHIP_BASE,
            "border-neutral-200/90 bg-neutral-50/80 text-[10px] text-neutral-700 dark:border-border dark:bg-muted/40 dark:text-neutral-200"
          )}
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
  className,
}: {
  commentsCount: number;
  attachmentsCount: number;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2.5 text-[10px] font-medium tabular-nums text-muted-foreground", className)}>
      <span className="inline-flex items-center gap-1" aria-label={`${commentsCount} comments`}>
        <MessageSquare className="h-3 w-3 opacity-70" strokeWidth={2} />
        {commentsCount}
      </span>
      <span className="inline-flex items-center gap-1" aria-label={`${attachmentsCount} attachments`}>
        <Paperclip className="h-3 w-3 opacity-70" strokeWidth={2} />
        {attachmentsCount}
      </span>
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
  reporterName,
}: {
  assignees: TaskAssignee[];
  fallbackLabel?: string;
  reporterName?: string | null;
}) {
  if (assignees.length === 0) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Avatar className="h-7 w-7 ring-2 ring-background dark:ring-card">
              <AvatarFallback className="text-[8px] font-medium tracking-tight bg-muted text-muted-foreground">
                UA
              </AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent className="max-w-[220px] text-xs">
            <p>{fallbackLabel}</p>
            {reporterName ? <p className="mt-1 text-muted-foreground">Created by {reporterName}</p> : null}
          </TooltipContent>
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
              <UserAvatar
                userId={assignee.id}
                name={assignee.name}
                avatarUrl={assignee.avatarUrl}
                className={cn(
                  "h-7 w-7 ring-2 ring-background shadow-sm dark:ring-card",
                  index > 0 && "-ml-2"
                )}
                fallbackClassName="text-[9px] font-medium tracking-tight bg-violet-100 text-violet-700 dark:bg-primary/15 dark:text-primary"
              />
            </TooltipTrigger>
            <TooltipContent className="max-w-[220px] text-xs">
              <p>Assigned to {assignee.name}</p>
              {assignee.email ? <p className="text-muted-foreground">{assignee.email}</p> : null}
              {index === 0 && reporterName ? (
                <p className="mt-1 border-t border-border/60 pt-1 text-muted-foreground">
                  Created by {reporterName}
                </p>
              ) : null}
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
  currentUserId?: string | null;
  onTaskClick?: (task: Task) => void;
  onToggleSelect?: (taskId: string) => void;
  recurringBoardMode?: boolean;
  recurringTemplate?: RecurringTemplateSummary;
  /** Stagger entrance animation on recurring board */
  cardIndex?: number;
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
  currentUserId,
  onTaskClick,
  onToggleSelect,
  recurringBoardMode = false,
  recurringTemplate,
  cardIndex = 0,
}: TaskCardProps) {
  const canManageTask =
    !!permissions?.canEditTask ||
    canUserEditTaskFully(task, currentUserId, false);
  const canDeleteThisTask = canUserDeleteTask(
    task,
    currentUserId,
    !!permissions?.canDeleteTask
  );
  /** Owners/admins (non-viewers) + assignees can use card hover actions. */
  const canWorkflowEdit =
    !permissions?.isViewer || isUserAssignedToTask(task, currentUserId);
  const showQuickActions = canWorkflowEdit && !isSelectionMode;
  const otherStatuses = useMemo(
    () => (statuses ?? []).filter((s) => s.id !== task.statusId),
    [statuses, task.statusId]
  );
  const isRecurring = isRecurringTask(task);
  const ribbonLabel = recurringBoardMode
    ? recurrenceBadgeLabel(task)
    : recurrenceRibbonLabel(task);
  const cadenceLine = recurringBoardMode
    ? formatRecurringScheduleLine(task, recurringTemplate)
    : recurrenceCadenceShort(task.recurrenceType);
  const statusForLane =
    boardColumnStatus ?? statuses?.find((s) => s.id === task.statusId);
  const missedTone = recurringBoardMode
    ? getRecurringMissedTone(task, statusForLane)
    : null;
  const statusCategory = getWorkflowStatusCategory(statusForLane);
  const isCompleted = statusCategory === "done";
  const dueTone = getDueDateTone(task.dueDate, isCompleted);
  const tagSource: TaskLabel[] = useMemo(
    () =>
      (task.tags ?? task.labels ?? []).map((tag) => ({
        id: "id" in tag && tag.id ? tag.id : tag.name,
        name: tag.name,
        color: tag.color,
      })),
    [task.labels, task.tags]
  );
  const { typeTag, blocked: blockedByTag, labels: partitionedLabels } = useMemo(
    () => partitionTaskTags(tagSource),
    [tagSource]
  );
  const taskType = typeTag ?? inferTaskType(task);
  const hasDependency = !!task.parentTaskId;
  const showBlockedBadge = blockedByTag;
  const showDependencyBadge = hasDependency && !showBlockedBadge;
  const labels =
    partitionedLabels.length > 0
      ? partitionedLabels
      : task.sprintId
        ? [{ id: "sprint", name: "Sprint", color: "#6366f1" }]
        : [];
  const descriptionPreview = useMemo(
    () => stripHtmlToPlainText(task.description),
    [task.description]
  );
  const titlePreview = useMemo(
    () => stripHtmlToPlainText(task.title) || "Untitled",
    [task.title]
  );
  const activityLine = useMemo(() => getActivityLine(task), [task]);
  const reporterName = useMemo(() => {
    if (!task.reporterId) return null;
    return assigneeMap?.[task.reporterId]?.name ?? "User";
  }, [assigneeMap, task.reporterId]);
  const activityComments = task.commentsCount ?? commentCount;
  const activityAttachments = task.attachmentsCount ?? attachmentCount;

  const initialAssignees: TaskAssignee[] = useMemo(() => {
    const ids = task.assigneeIds?.length
      ? task.assigneeIds
      : task.assigneeId
        ? [task.assigneeId]
        : [];
    if (ids.length === 0) return task.assignees?.length ? task.assignees : [];
    return ids.map((id) => {
      if (assigneeMap?.[id]) {
        return { id, name: assigneeMap[id].name, avatarUrl: assigneeMap[id].avatarUrl };
      }
      const fromTask = task.assignees?.find((a) => a.id === id);
      if (fromTask) return fromTask;
      return { id, name: "User" };
    });
  }, [task.assignees, task.assigneeId, task.assigneeIds, assigneeMap]);
  const [localAssignees, setLocalAssignees] = useState<TaskAssignee[]>(initialAssignees);
  /** Radix menu close can pass the click through to the card and open the task modal. */
  const suppressOpenRef = useRef(false);
  useEffect(() => {
    setLocalAssignees(initialAssignees);
  }, [initialAssignees]);

  const checklistTotal =
    subtaskInfo?.total ??
    task.checklistTotal ??
    (Array.isArray(task.subtasks) ? task.subtasks.length : 0);
  const checklistCompleted =
    subtaskInfo?.completed ??
    task.checklistCompleted ??
    (Array.isArray(task.subtasks) ? task.subtasks.filter((s) => s.completed).length : 0);
  const canCompleteRecurringOccurrence =
    !isRecurring || checklistTotal === 0 || checklistCompleted === checklistTotal;

  const prioCfg = PRIORITY[normalizePriority(task.priority)] ?? PRIORITY.medium;
  const statusBulbClass =
    statusCategory === "todo"
      ? STATUS_BULB.todo
      : statusCategory === "done"
        ? STATUS_BULB.done
        : statusCategory === "in_progress"
          ? STATUS_BULB.in_progress
          : "bg-neutral-300 ring-2 ring-neutral-200/80 dark:bg-neutral-600 dark:ring-neutral-500/40";
  const leftAccentClass =
    statusCategory === "todo"
      ? STATUS_LANE_ACCENT.todo
      : statusCategory === "done"
        ? STATUS_LANE_ACCENT.done
        : statusCategory === "in_progress"
          ? STATUS_LANE_ACCENT.in_progress
          : prioCfg.accentBar;
  const statusSurfaceClass =
    statusCategory === "todo"
      ? STATUS_CARD_SURFACE.todo
      : statusCategory === "done"
        ? STATUS_CARD_SURFACE.done
        : statusCategory === "in_progress"
          ? STATUS_CARD_SURFACE.in_progress
          : STATUS_CARD_SURFACE.default;

  const recurringTheme = getRecurringCardTheme(
    recurringTemplate?.repeatType ?? task.recurrenceType
  );
  const isRecurringOverdue =
    recurringBoardMode &&
    (boardColumnStatus?.id === RECURRING_OVERDUE_COLUMN_ID || missedTone === "critical");

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => {
        if (suppressOpenRef.current) {
          suppressOpenRef.current = false;
          return;
        }
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
        "group/card relative flex min-h-[9rem] cursor-pointer flex-col overflow-hidden border shadow-sm",
        recurringBoardMode ? "rounded-xl" : "rounded-lg",
        !recurringBoardMode && statusSurfaceClass,
        recurringBoardMode
          ? cn(
              "shadow-md backdrop-blur-sm",
              isRecurringOverdue ? recurringCardOverdueSurface() : recurringTheme.surface,
              !isOverlay && "animate-recurring-card-enter",
              !isCompleted &&
                "hover:-translate-y-1 hover:scale-[1.01] hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-black/25",
              "transition-[box-shadow,transform,border-color,opacity] duration-300 ease-out"
            )
          : cn(
              "transition-[box-shadow,transform,border-color,opacity] duration-200 ease-out",
              "hover:-translate-y-px",
              !isCompleted && "hover:border-slate-300/70 hover:shadow-[0_2px_12px_-4px_rgba(15,23,42,0.1)]"
            ),
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/25 focus-visible:ring-offset-2",
        isOverlay && "scale-[1.02] shadow-lg ring-2 ring-violet-400/30",
        isSelected && "border-violet-400/40 bg-violet-50/30 ring-2 ring-violet-400/20 dark:bg-violet-500/5",
        isMoving && "opacity-65",
        task.id.startsWith("temp-") && "border-dashed",
        isRecurring && !recurringBoardMode && SERIES_CARD_CHROME,
        isCompleted && "shadow-none",
        !canWorkflowEdit && "cursor-default hover:translate-y-0 hover:shadow-sm",
      )}
      style={
        recurringBoardMode && !isOverlay
          ? { animationDelay: `${Math.min(cardIndex, 10) * 55}ms` }
          : undefined
      }
      data-cy={`task-card-${task.id}`}
      aria-label={`Open task ${task.title}`}
    >
      {/* Status accent rail */}
      {!recurringBoardMode ? (
        <span
          className={cn(
            "pointer-events-none absolute bottom-3 left-0 top-3 w-1 rounded-r-full",
            leftAccentClass,
          )}
          aria-hidden
        />
      ) : null}
      {recurringBoardMode && !isOverlay ? (
        <span
          className={cn(
            "recurring-card-glow-orb pointer-events-none absolute -right-8 -top-8 z-0 h-28 w-28 rounded-full blur-3xl",
            recurringTheme.glow
          )}
          aria-hidden
        />
      ) : null}
      {recurringBoardMode ? (
        <span
          className="recurring-shine-track pointer-events-none absolute inset-0 z-[5] opacity-0 transition-all duration-700 ease-out"
          style={{
            background:
              "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.4) 50%, transparent 65%)",
            transform: "translateX(-120%)",
          }}
          aria-hidden
        />
      ) : null}
      {isRecurring ? (
        <span
          className={cn(
            "pointer-events-none absolute rounded-full shadow-sm",
            recurringBoardMode
              ? cn("bottom-0 left-0 top-0 w-1 rounded-none rounded-r-full", recurringTheme.rail)
              : cn(
                  "left-2 top-3 bottom-3 w-0.5",
                  cadenceBarClass(recurringTemplate?.repeatType ?? task.recurrenceType)
                )
          )}
          aria-hidden
        />
      ) : null}

      {ribbonLabel ? (
        <div
          className={cn(
            "pointer-events-none absolute right-2 top-2 z-[15] flex items-center gap-1 text-[10px] font-semibold",
            recurringBoardMode
              ? cn(
                  "rounded-full border px-2 py-0.5 shadow-sm backdrop-blur-sm",
                  recurringTheme.ribbon
                )
              : "rounded-md border border-indigo-500/20 bg-indigo-500/[0.07] px-1.5 py-0.5 text-indigo-800 dark:border-indigo-400/25 dark:bg-indigo-500/10 dark:text-indigo-200"
          )}
          aria-label={`Recurring series: ${ribbonLabel}`}
        >
          <Repeat
            className={cn(
              "h-3 w-3 shrink-0 opacity-80",
              recurringBoardMode && "recurring-ribbon-icon"
            )}
            aria-hidden
          />
          {ribbonLabel}
        </div>
      ) : null}

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

      {showQuickActions && !(recurringBoardMode && isRecurring) ? (
        <div className={QUICK_ACTIONS_BAR}>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={QUICK_ACTION_BTN}
            data-quick-action
            aria-label="Open task"
            onClick={(e) => {
              e.stopPropagation();
              onTaskClick?.(task);
            }}
          >
            <ArrowUpRight className="h-3 w-3" />
          </Button>
          {recurringBoardMode && isRecurring ? (
            <>
              {quickActions?.onCompleteOccurrence ? (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className={QUICK_ACTION_BTN}
                  data-quick-action
                  aria-label="Mark done"
                  title={
                    canCompleteRecurringOccurrence
                      ? "Mark done"
                      : "Finish all subtasks before marking this run done"
                  }
                  disabled={!canCompleteRecurringOccurrence}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!canCompleteRecurringOccurrence) return;
                    suppressOpenRef.current = true;
                    quickActions.onCompleteOccurrence?.(task);
                  }}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </Button>
              ) : null}
              {quickActions?.onSkipNextOccurrence ? (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className={QUICK_ACTION_BTN}
                  data-quick-action
                  aria-label="Skip next run"
                  onClick={(e) => {
                    e.stopPropagation();
                    suppressOpenRef.current = true;
                    quickActions.onSkipNextOccurrence?.(task);
                  }}
                >
                  <SkipForward className="h-3.5 w-3.5" />
                </Button>
              ) : null}
              {quickActions?.onPauseSeries ? (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className={QUICK_ACTION_BTN}
                  data-quick-action
                  aria-label="Pause series"
                  onClick={(e) => {
                    e.stopPropagation();
                    suppressOpenRef.current = true;
                    quickActions.onPauseSeries?.(task);
                  }}
                >
                  <Pause className="h-3.5 w-3.5" />
                </Button>
              ) : null}
            </>
          ) : (
            <>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={QUICK_ACTION_BTN}
            data-quick-action
            aria-label="Edit task"
            onClick={(e) => {
              e.stopPropagation();
              quickActions?.onEdit?.(task);
            }}
          >
            <SquarePen className="h-3.5 w-3.5" />
          </Button>
          {!!quickActions?.onChangeStatus && otherStatuses.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className={QUICK_ACTION_BTN}
                  data-quick-action
                  aria-label="Move task"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-44"
                data-quick-action
                onCloseAutoFocus={(e) => e.preventDefault()}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <DropdownMenuLabel className="text-xs">Move to</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {otherStatuses.map((s) => (
                  <DropdownMenuItem
                    key={s.id}
                    onSelect={() => {
                      suppressOpenRef.current = true;
                      quickActions.onChangeStatus?.(task, s.id);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="text-xs"
                  >
                    <ArrowRight className="mr-2 h-3.5 w-3.5" />
                    {s.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {canManageTask ? (
            <TaskAssigneePopover
              task={{
                id: task.id,
                projectId: task.projectId,
                assigneeId: task.assigneeId,
                assigneeIds: task.assigneeIds,
                assignees: localAssignees,
              }}
              multiAssign
              onAssigneesChange={setLocalAssignees}
              trigger={
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className={QUICK_ACTION_BTN}
                  data-quick-action
                  aria-label="Assign task"
                  onClick={(e) => e.stopPropagation()}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                </Button>
              }
            />
          ) : null}
            </>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className={QUICK_ACTION_BTN}
                data-quick-action
                aria-label="More task actions"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-44"
              data-quick-action
              onCloseAutoFocus={(e) => e.preventDefault()}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {isRecurring && quickActions?.onCompleteOccurrence ? (
                <>
                  <DropdownMenuItem
                    disabled={!canCompleteRecurringOccurrence}
                    onSelect={() => {
                      if (!canCompleteRecurringOccurrence) return;
                      suppressOpenRef.current = true;
                      quickActions.onCompleteOccurrence?.(task);
                    }}
                    className="text-xs"
                  >
                    <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                    {canCompleteRecurringOccurrence
                      ? "Complete run"
                      : "Finish subtasks first"}
                  </DropdownMenuItem>
                  {quickActions?.onSkipNextOccurrence ? (
                    <DropdownMenuItem
                      onSelect={() => {
                        suppressOpenRef.current = true;
                        quickActions.onSkipNextOccurrence?.(task);
                      }}
                      className="text-xs"
                    >
                      <SkipForward className="mr-2 h-3.5 w-3.5" />
                      Skip next run
                    </DropdownMenuItem>
                  ) : null}
                  {recurringBoardMode && quickActions?.onEdit ? (
                    <DropdownMenuItem
                      onSelect={() => {
                        suppressOpenRef.current = true;
                        quickActions.onEdit?.(task);
                      }}
                      className="text-xs"
                    >
                      <SquarePen className="mr-2 h-3.5 w-3.5" />
                      Edit run details
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuSeparator />
                </>
              ) : null}
              {canManageTask ? (
                <DropdownMenuItem
                  onSelect={() => {
                    suppressOpenRef.current = true;
                    quickActions?.onEdit?.(task);
                  }}
                  className="text-xs"
                >
                  <Calendar className="mr-2 h-3.5 w-3.5" />
                  Change due date
                </DropdownMenuItem>
              ) : null}
              {canDeleteThisTask && quickActions?.onDelete ? (
                <DropdownMenuItem
                  onSelect={() => {
                    suppressOpenRef.current = true;
                    quickActions.onDelete?.(task);
                  }}
                  className="text-xs text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  {recurringBoardMode && isRecurring ? "Delete run" : "Delete task"}
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null}

      {showQuickActions && recurringBoardMode && isRecurring ? (
        <div
          className={cn(
            EXEC_RECURRING_ACTIONS,
            "pointer-events-none group-hover/card:pointer-events-auto group-focus-within/card:pointer-events-auto"
          )}
        >
          {quickActions?.onCompleteOccurrence ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 flex-1 gap-1 px-1 text-[10px] font-semibold"
              data-quick-action
              title={
                canCompleteRecurringOccurrence
                  ? "Mark done"
                  : "Finish all subtasks before marking this run done"
              }
              disabled={!canCompleteRecurringOccurrence}
              onClick={(e) => {
                e.stopPropagation();
                if (!canCompleteRecurringOccurrence) return;
                suppressOpenRef.current = true;
                quickActions.onCompleteOccurrence?.(task);
              }}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Done
            </Button>
          ) : null}
          {quickActions?.onSkipNextOccurrence ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 flex-1 gap-1 px-1 text-[10px] font-semibold"
              data-quick-action
              onClick={(e) => {
                e.stopPropagation();
                suppressOpenRef.current = true;
                quickActions.onSkipNextOccurrence?.(task);
              }}
            >
              <SkipForward className="h-3.5 w-3.5" />
              Skip next
            </Button>
          ) : null}
          {quickActions?.onSnoozeOccurrence ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 flex-1 gap-1 px-1 text-[10px] font-semibold"
              data-quick-action
              onClick={(e) => {
                e.stopPropagation();
                suppressOpenRef.current = true;
                quickActions.onSnoozeOccurrence?.(task);
              }}
            >
              <AlarmClock className="h-3.5 w-3.5" />
              Snooze
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 flex-1 gap-1 px-1 text-[10px] font-semibold"
            data-quick-action
            onClick={(e) => {
              e.stopPropagation();
              onTaskClick?.(task);
            }}
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
            Details
          </Button>
        </div>
      ) : null}

      {isMoving && (
        <div className="absolute inset-0 z-30 flex items-center justify-center rounded-2xl bg-[#FCFCFD]/80 backdrop-blur-[2px] dark:bg-card/80">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary/40 border-t-primary" />
        </div>
      )}

      <div
        className={cn(
          "relative z-10 flex min-h-0 flex-1 flex-col px-3 pb-2.5 pt-2.5 pl-3.5",
          recurringBoardMode && "pb-10",
          isSelectionMode && "pl-8"
        )}
      >
        <div className="mb-1.5 flex min-h-[20px] items-start justify-between gap-1.5 pr-[5.5rem]">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
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
            <span className="rounded-md bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              #{task.id.slice(0, 4).toUpperCase()}
            </span>
            {taskType ? <TaskTypeBadge type={taskType} /> : null}
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
            {showBlockedBadge ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-rose-300/60 bg-rose-500/[0.07] px-1.5 py-0.5 text-[10px] font-semibold text-rose-800 dark:border-rose-500/25 dark:text-rose-200">
                <Ban className="h-3 w-3" aria-hidden />
                Blocked
              </span>
            ) : null}
            {showDependencyBadge ? (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-1 rounded-md border border-amber-300/60 bg-amber-500/[0.07] px-1.5 py-0.5 text-[10px] font-semibold text-amber-900 dark:border-amber-500/25 dark:text-amber-100">
                      <Link2 className="h-3 w-3" aria-hidden />
                      Dep
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">Depends on another task</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null}
          </div>
        </div>

        <h3 className={cn(isCompleted ? TASK_CARD_TITLE_DONE : TASK_CARD_TITLE)}>
          {titlePreview}
        </h3>

        {recurringBoardMode && recurringTemplate?.title ? (
          <p className="mt-0.5 truncate text-[11px] font-semibold text-muted-foreground/90">
            {recurringTemplate.title}
          </p>
        ) : null}

        {recurringBoardMode && ribbonLabel ? (
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                getRecurringCardTheme(recurringTemplate?.repeatType ?? task.recurrenceType).ribbon
              )}
            >
              <Repeat className="h-3 w-3 opacity-80" aria-hidden />
              {ribbonLabel}
            </span>
            {typeof task.recurrenceSequence === "number" && task.recurrenceSequence > 0 ? (
              <span className="rounded-md bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
                Run #{task.recurrenceSequence}
              </span>
            ) : null}
          </div>
        ) : null}

        {descriptionPreview ? (
          <p className={cn("mt-1", TASK_CARD_DESCRIPTION)}>
            {descriptionPreview}
          </p>
        ) : null}

        {cadenceLine ? (
          <p
            className={cn(
              "mt-1 text-[10px] font-medium",
              recurringBoardMode
                ? cn("tracking-wide", recurringTheme.schedule)
                : "text-indigo-700/75 dark:text-indigo-300/75"
            )}
          >
            {cadenceLine}
            {!recurringBoardMode && task.dueDate
              ? ` · due ${new Date(task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
              : ""}
          </p>
        ) : null}

        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          <TaskPriorityBadge priority={task.priority} />
          {missedTone ? (
            <span
              className={cn(
                APP_CHIP_BASE,
                "gap-1 border-transparent text-[10px] font-semibold",
                recurringBoardMode
                  ? recurringCardMissedBadge(missedTone)
                  : missedTone === "critical"
                    ? "bg-rose-500/[0.1] text-rose-700 ring-1 ring-rose-500/15 dark:text-rose-300"
                    : "bg-amber-500/[0.1] text-amber-800 ring-1 ring-amber-500/12 dark:text-amber-300"
              )}
            >
              <AlertCircle className={APP_CHIP_ICON} />
              {missedTone === "critical" ? "Missed" : "Delayed"}
            </span>
          ) : null}
          {dueTone && task.dueDate ? (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className={cn(
                      APP_CHIP_BASE,
                      "gap-1 text-[10px] font-medium",
                      dueTone.className
                    )}
                  >
                    <dueTone.icon className={APP_CHIP_ICON} strokeWidth={2} />
                    {dueTone.label}
                  </span>
                </TooltipTrigger>
                <TooltipContent className="text-xs">
                  Due {new Date(task.dueDate).toLocaleString()}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
        </div>

        {labels.length > 0 ? (
          <div className="mt-1.5">
            <TaskLabelGroup labels={labels} />
          </div>
        ) : null}

        <SubtaskProgressInline completed={checklistCompleted} total={checklistTotal} />

        {activityLine ? (
          <p className="mt-1.5 text-[10px] text-muted-foreground/70">{activityLine}</p>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/35 pt-2">
          <TaskMetaRow
            commentsCount={activityComments}
            attachmentsCount={activityAttachments}
            className="min-w-0 flex-1"
          />
          <TaskAssigneePopover
            task={{
              id: task.id,
              projectId: task.projectId,
              assigneeId: task.assigneeId,
              assigneeIds: task.assigneeIds,
              assignees: localAssignees,
            }}
            multiAssign
            onAssigneesChange={setLocalAssignees}
            trigger={
              <button
                type="button"
                data-quick-action
                className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-2"
                aria-label="Change assignee"
                onClick={(e) => e.stopPropagation()}
              >
                <TaskAvatarStack assignees={localAssignees} reporterName={reporterName} />
              </button>
            }
          />
        </div>
      </div>
    </div>
  );
}

