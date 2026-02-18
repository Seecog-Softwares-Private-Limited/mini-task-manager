"use client";

import { cn } from "@/lib/utils";
import type { BoardStats } from "./kanban-board";
import { ListTodo, AlertCircle, CheckCircle2, Clock, TrendingUp, Zap } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BoardStatsBarProps {
  stats: BoardStats;
  className?: string;
}

export function BoardStatsBar({ stats, className }: BoardStatsBarProps) {
  const items = [
    {
      label: "Total",
      value: stats.total,
      icon: ListTodo,
      color: "text-foreground",
      bgColor: "bg-muted",
      tooltip: `${stats.total} total task${stats.total !== 1 ? "s" : ""} on this board`,
    },
    {
      label: "In Progress",
      value: stats.inProgress,
      icon: Clock,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-500/10",
      tooltip: `${stats.inProgress} task${stats.inProgress !== 1 ? "s" : ""} currently in progress`,
    },
    {
      label: "Overdue",
      value: stats.overdue,
      icon: AlertCircle,
      color: stats.overdue > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground",
      bgColor: stats.overdue > 0 ? "bg-red-500/10" : "bg-muted",
      tooltip: stats.overdue > 0
        ? `${stats.overdue} task${stats.overdue > 1 ? "s" : ""} past due date — needs attention`
        : "No overdue tasks — great job!",
    },
    {
      label: "Done",
      value: `${stats.completedPercent}%`,
      icon: CheckCircle2,
      color: stats.completedPercent >= 75
        ? "text-emerald-600 dark:text-emerald-400"
        : stats.completedPercent > 0
          ? "text-amber-600 dark:text-amber-400"
          : "text-muted-foreground",
      bgColor: stats.completedPercent >= 75
        ? "bg-emerald-500/10"
        : stats.completedPercent > 0
          ? "bg-amber-500/10"
          : "bg-muted",
      tooltip: stats.completedPercent === 100
        ? "All tasks completed!"
        : `${stats.completedPercent}% of tasks completed`,
    },
  ];

  // Determine progress bar color
  function getProgressColor(pct: number) {
    if (pct >= 75) return "bg-emerald-500";
    if (pct >= 40) return "bg-amber-500";
    if (pct > 0) return "bg-orange-500";
    return "bg-muted-foreground/20";
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        {items.map((item) => (
          <Tooltip key={item.label}>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm transition-colors cursor-default",
                  item.bgColor
                )}
              >
                <item.icon className={cn("h-3.5 w-3.5", item.color)} />
                <span className={cn("font-semibold tabular-nums", item.color)}>
                  {item.value}
                </span>
                <span className="text-xs text-muted-foreground hidden sm:inline">{item.label}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="text-xs max-w-[200px]">{item.tooltip}</TooltipContent>
          </Tooltip>
        ))}

        {/* Velocity indicator */}
        {stats.completedPercent === 100 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-1.5 animate-in fade-in duration-500">
                <Zap className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">All Done</span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="text-xs">Every task is completed!</TooltipContent>
          </Tooltip>
        )}

        {/* Progress bar */}
        {stats.total > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 ml-auto cursor-default">
                <TrendingUp className={cn(
                  "h-3 w-3",
                  stats.completedPercent >= 75 ? "text-emerald-500" : "text-muted-foreground/50"
                )} />
                <div className="h-2 w-28 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-1000 ease-out",
                      getProgressColor(stats.completedPercent)
                    )}
                    style={{ width: `${Math.min(stats.completedPercent, 100)}%` }}
                  />
                </div>
                <span className="text-[11px] text-muted-foreground tabular-nums font-medium">
                  {stats.completedPercent}%
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="text-xs">
              {stats.completedPercent}% complete — {stats.total - stats.inProgress - stats.overdue} remaining
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
