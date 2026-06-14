"use client";

import { cn } from "@/lib/utils";
import type { RecurringTaskSummary } from "@/types/api";
import type { BoardStats } from "@/components/kanban/kanban-board";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Clock,
  ListTodo,
  PauseCircle,
  Zap,
  type LucideIcon,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type BadgeStat = {
  id: string;
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  tooltip: string;
};

interface RecurringSummaryStatsProps {
  summary?: RecurringTaskSummary;
  boardStats?: BoardStats;
  isLoading?: boolean;
  className?: string;
}

export function RecurringSummaryStats({
  summary,
  boardStats,
  isLoading,
  className,
}: RecurringSummaryStatsProps) {
  const completedPercent = boardStats?.completedPercent ?? 0;
  const boardTotal = boardStats?.total ?? 0;

  const badges: BadgeStat[] = [
    {
      id: "on-board",
      label: "On board",
      value: boardTotal,
      icon: ListTodo,
      color: "text-slate-700 dark:text-slate-200",
      bgColor: "bg-slate-500/10",
      tooltip: `${boardTotal} recurring occurrence${boardTotal !== 1 ? "s" : ""} on this project board`,
    },
    {
      id: "due-week",
      label: "Due this week",
      value: summary?.dueThisWeek ?? 0,
      icon: CalendarClock,
      color: "text-violet-600 dark:text-violet-400",
      bgColor: "bg-violet-500/10",
      tooltip: `${summary?.dueThisWeek ?? 0} occurrence${(summary?.dueThisWeek ?? 0) !== 1 ? "s" : ""} due within the next 7 days`,
    },
    {
      id: "in-progress",
      label: "In progress",
      value: boardStats?.inProgress ?? 0,
      icon: Clock,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-500/10",
      tooltip: `${boardStats?.inProgress ?? 0} occurrence${(boardStats?.inProgress ?? 0) !== 1 ? "s" : ""} currently in progress`,
    },
    {
      id: "overdue",
      label: "Overdue",
      value: summary?.overdue ?? 0,
      icon: AlertCircle,
      color:
        (summary?.overdue ?? 0) > 0
          ? "text-red-600 dark:text-red-400"
          : "text-muted-foreground",
      bgColor: (summary?.overdue ?? 0) > 0 ? "bg-red-500/10" : "bg-muted",
      tooltip:
        (summary?.overdue ?? 0) > 0
          ? `${summary?.overdue} overdue occurrence${(summary?.overdue ?? 0) !== 1 ? "s" : ""} need attention`
          : "No overdue recurring tasks",
    },
    {
      id: "done",
      label: "Done",
      value: `${completedPercent}%`,
      icon: CheckCircle2,
      color:
        completedPercent >= 75
          ? "text-emerald-600 dark:text-emerald-400"
          : completedPercent > 0
            ? "text-amber-600 dark:text-amber-400"
            : "text-muted-foreground",
      bgColor:
        completedPercent >= 75
          ? "bg-emerald-500/10"
          : completedPercent > 0
            ? "bg-amber-500/10"
            : "bg-muted",
      tooltip:
        completedPercent === 100
          ? "All board occurrences completed!"
          : `${completedPercent}% of board occurrences completed`,
    },
    {
      id: "paused",
      label: "Paused",
      value: summary?.paused ?? 0,
      icon: PauseCircle,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-500/10",
      tooltip:
        (summary?.paused ?? 0) > 0
          ? `${summary?.paused} recurring series paused`
          : "No paused recurring series",
    },
  ];

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className={cn("flex flex-wrap items-center gap-2", className)}
        role="list"
        aria-label="Recurring task statistics"
      >
        {badges.map((badge) => {
          const Icon = badge.icon;
          return (
            <Tooltip key={badge.id}>
              <TooltipTrigger asChild>
                <div
                  role="listitem"
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm transition-colors",
                    badge.bgColor
                  )}
                >
                  <Icon className={cn("h-3.5 w-3.5 shrink-0", badge.color)} aria-hidden />
                  {isLoading ? (
                    <span className="h-4 w-5 animate-pulse rounded bg-muted-foreground/20" />
                  ) : (
                    <span className={cn("font-semibold tabular-nums", badge.color)}>
                      {badge.value}
                    </span>
                  )}
                  <span className="hidden text-xs text-muted-foreground sm:inline">
                    {badge.label}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[220px] text-xs">
                {badge.tooltip}
              </TooltipContent>
            </Tooltip>
          );
        })}

        {!isLoading && completedPercent === 100 && boardTotal > 0 ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-1.5 animate-in fade-in duration-500">
                <Zap className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  All done
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="text-xs">Every board occurrence is completed!</TooltipContent>
          </Tooltip>
        ) : null}
      </div>
    </TooltipProvider>
  );
}
