"use client";

import { cn } from "@/lib/utils";
import { stripHtmlToPlainText } from "@/lib/project-description-plain";
import type { Task, WorkflowStatus } from "@/types/api";
import type { AssigneeMap, SubtaskInfo } from "./kanban-board";
import type { BoardPermissions } from "@/hooks/use-board-permissions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Calendar,
  Hash,
  AlertCircle,
  Zap,
  GitBranch,
  CheckSquare2,
  Inbox,
  Repeat,
} from "lucide-react";
import { isRecurringTask, recurrenceTypeColumnLabel } from "@/lib/recurrence-display";

const PRIORITY_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  CRITICAL: { color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500", label: "Critical" },
  HIGH: { color: "text-red-600 dark:text-red-400", bg: "bg-red-500", label: "High" },
  MEDIUM: { color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500", label: "Medium" },
  LOW: { color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500", label: "Low" },
};

const STATUS_DOT_COLORS = [
  "bg-blue-500",
  "bg-amber-500",
  "bg-purple-500",
  "bg-emerald-500",
  "bg-red-500",
  "bg-cyan-500",
];

interface BoardTableViewProps {
  tasks: Task[];
  statuses: WorkflowStatus[];
  assigneeMap?: AssigneeMap;
  subtaskMap?: Record<string, SubtaskInfo>;
  onTaskClick?: (task: Task) => void;
  isSelectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (taskId: string) => void;
  permissions?: BoardPermissions;
  className?: string;
}

export function BoardTableView({
  tasks,
  statuses,
  assigneeMap,
  subtaskMap,
  onTaskClick,
  isSelectionMode,
  selectedIds,
  onToggleSelect,
  permissions,
  className,
}: BoardTableViewProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-muted/10 py-14 text-center">
        <Inbox className="h-8 w-8 text-muted-foreground/20 mb-2" />
        <p className="text-sm font-medium text-muted-foreground">No tasks to display</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          {permissions?.isViewer
            ? "No tasks have been created for this project yet."
            : "Create a task to get started."}
        </p>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn("rounded-xl border overflow-hidden", className)}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                {isSelectionMode && (
                  <th className="w-10 py-3 px-3">
                    <span className="sr-only">Select</span>
                  </th>
                )}
                <th className="text-left font-semibold text-muted-foreground text-xs py-3 px-4 w-[30%]">Task</th>
                <th className="text-left font-semibold text-muted-foreground text-xs py-3 px-4">Type</th>
                <th className="text-left font-semibold text-muted-foreground text-xs py-3 px-4">Status</th>
                <th className="text-left font-semibold text-muted-foreground text-xs py-3 px-4">Priority</th>
                <th className="text-left font-semibold text-muted-foreground text-xs py-3 px-4">Assignee</th>
                <th className="text-left font-semibold text-muted-foreground text-xs py-3 px-4">Due Date</th>
                <th className="text-center font-semibold text-muted-foreground text-xs py-3 px-4 w-16">SP</th>
                <th className="text-center font-semibold text-muted-foreground text-xs py-3 px-4 w-20">Subtasks</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => {
                const priority = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.MEDIUM;
                const status = statuses.find((s) => s.id === task.statusId);
                const statusIdx = statuses.findIndex((s) => s.id === task.statusId);
                const assignee = task.assigneeId ? assigneeMap?.[task.assigneeId] : null;
                const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
                const sub = subtaskMap?.[task.id];
                const isSelected = selectedIds?.has(task.id);

                return (
                  <tr
                    key={task.id}
                    onClick={() => {
                      if (isSelectionMode && onToggleSelect) {
                        onToggleSelect(task.id);
                      } else {
                        onTaskClick?.(task);
                      }
                    }}
                    className={cn(
                      "border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors group",
                      isSelected && "bg-primary/[0.03] hover:bg-primary/[0.06]"
                    )}
                  >
                    {/* Selection checkbox */}
                    {isSelectionMode && (
                      <td className="py-3 px-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleSelect?.(task.id);
                          }}
                          className={cn(
                            "flex h-5 w-5 items-center justify-center rounded border-2 transition-all",
                            isSelected
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-muted-foreground/30 hover:border-primary/50 bg-background"
                          )}
                          aria-label={isSelected ? "Deselect task" : "Select task"}
                        >
                          {isSelected && <CheckSquare2 className="h-3 w-3" />}
                        </button>
                      </td>
                    )}

                    {/* Task */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", priority.bg)} />
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5 max-w-xs">
                              {stripHtmlToPlainText(task.description)}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="py-3 px-4">
                      {isRecurringTask(task) ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-indigo-500/25 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-800 dark:text-indigo-200">
                          <Repeat className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
                          {recurrenceTypeColumnLabel(task)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">One-time</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="text-[11px] font-medium gap-1.5">
                        <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT_COLORS[statusIdx >= 0 ? statusIdx % STATUS_DOT_COLORS.length : 0])} />
                        {status?.name ?? "—"}
                      </Badge>
                    </td>

                    {/* Priority */}
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                        <span className={cn("h-2 w-2 rounded-full", priority.bg)} />
                        {priority.label}
                      </span>
                    </td>

                    {/* Assignee */}
                    <td className="py-3 px-4">
                      {assignee ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={assignee.avatarUrl} />
                                <AvatarFallback className="text-[8px]">
                                  {assignee.name.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs truncate max-w-[100px]">{assignee.name}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs">{assignee.name}</TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>

                    {/* Due date */}
                    <td className="py-3 px-4">
                      {task.dueDate ? (
                        <span className={cn("inline-flex items-center gap-1 text-xs", isOverdue && "text-red-500 font-medium")}>
                          {isOverdue ? <AlertCircle className="h-3 w-3" /> : <Calendar className="h-3 w-3 text-muted-foreground" />}
                          {new Date(task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>

                    {/* Story points */}
                    <td className="py-3 px-4 text-center">
                      {task.storyPoints != null && task.storyPoints > 0 ? (
                        <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                          <Hash className="h-3 w-3" />{task.storyPoints}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>

                    {/* Subtask progress */}
                    <td className="py-3 px-4 text-center">
                      {sub && sub.total > 0 ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className={cn(
                              "inline-flex items-center gap-1 text-xs font-medium",
                              sub.completed === sub.total ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                            )}>
                              <GitBranch className="h-3 w-3" />
                              {sub.completed}/{sub.total}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs">
                            {sub.completed === sub.total ? "All subtasks complete" : `${sub.completed} of ${sub.total} subtasks done`}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </TooltipProvider>
  );
}
