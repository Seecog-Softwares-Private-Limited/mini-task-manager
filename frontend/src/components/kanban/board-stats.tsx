"use client";

import { cn } from "@/lib/utils";
import { APP_CHIP_BASE, APP_CHIP_ICON } from "@/lib/ui/design-tokens";
import type { BoardStats } from "./kanban-board";
import { AlertCircle, CheckCircle2, Clock, ListTodo, Repeat } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BoardStatsBarProps {
  stats: BoardStats;
  className?: string;
  onRecurringFilterClick?: () => void;
  hideRecurringStat?: boolean;
}

type StatItem = {
  key: string;
  label: string;
  value: string | number;
  icon: typeof ListTodo;
  tone: "neutral" | "amber" | "warning" | "success" | "indigo";
  tooltip: string;
  onClick?: () => void;
};

const STAT_CHIP = cn(
  APP_CHIP_BASE,
  "border-border/45 bg-background/80 tabular-nums shadow-sm"
);

const TONE_STYLES = {
  neutral: {
    chip: "hover:bg-muted/40",
    icon: "text-muted-foreground",
    value: "text-foreground",
    label: "text-muted-foreground",
  },
  amber: {
    chip: "border-amber-200/40 bg-amber-50/50 hover:bg-amber-50/70 dark:border-amber-500/15 dark:bg-amber-500/8",
    icon: "text-amber-600 dark:text-amber-400",
    value: "text-amber-800 dark:text-amber-300",
    label: "text-amber-700/80 dark:text-amber-400/80",
  },
  warning: {
    chip: "border-orange-200/45 bg-orange-50/45 hover:bg-orange-50/65 dark:border-orange-500/15 dark:bg-orange-500/8",
    icon: "text-orange-600 dark:text-orange-400",
    value: "text-orange-800 dark:text-orange-300",
    label: "text-orange-700/80 dark:text-orange-400/80",
  },
  success: {
    chip: "border-emerald-200/40 bg-emerald-50/45 hover:bg-emerald-50/65 dark:border-emerald-500/15 dark:bg-emerald-500/8",
    icon: "text-emerald-600 dark:text-emerald-400",
    value: "text-emerald-800 dark:text-emerald-300",
    label: "text-emerald-700/80 dark:text-emerald-400/80",
  },
  indigo: {
    chip: "border-indigo-200/40 bg-indigo-50/45 hover:bg-indigo-50/65 dark:border-indigo-500/15 dark:bg-indigo-500/8",
    icon: "text-indigo-600 dark:text-indigo-400",
    value: "text-indigo-800 dark:text-indigo-300",
    label: "text-indigo-700/80 dark:text-indigo-400/80",
  },
} as const;

function StatChip({ item }: { item: StatItem }) {
  const tone = TONE_STYLES[item.tone];
  const content = (
    <>
      <item.icon className={cn(APP_CHIP_ICON, tone.icon)} />
      <span className={cn("font-semibold tabular-nums leading-none", tone.value)}>
        {item.value}
      </span>
      <span className={cn("hidden leading-none sm:inline", tone.label)}>{item.label}</span>
    </>
  );

  if (item.onClick) {
    return (
      <button
        type="button"
        onClick={item.onClick}
        className={cn(STAT_CHIP, tone.chip, "cursor-pointer hover:brightness-[0.98]")}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={cn(STAT_CHIP, tone.chip, "cursor-default")}>{content}</div>
  );
}

export function BoardStatsBar({
  stats,
  className,
  onRecurringFilterClick,
  hideRecurringStat = false,
}: BoardStatsBarProps) {
  const overdueTone: StatItem["tone"] =
    stats.overdue > 0 ? (stats.overdue >= 5 ? "warning" : "amber") : "neutral";

  const doneTone: StatItem["tone"] =
    stats.completedPercent >= 75
      ? "success"
      : stats.completedPercent > 0
        ? "amber"
        : "neutral";

  const items: StatItem[] = [
    {
      key: "total",
      label: "Total",
      value: stats.total,
      icon: ListTodo,
      tone: "neutral",
      tooltip: `${stats.total} total task${stats.total !== 1 ? "s" : ""} on this board`,
    },
    {
      key: "in-progress",
      label: "In progress",
      value: stats.inProgress,
      icon: Clock,
      tone: stats.inProgress > 0 ? "amber" : "neutral",
      tooltip: `${stats.inProgress} task${stats.inProgress !== 1 ? "s" : ""} currently in progress`,
    },
    {
      key: "overdue",
      label: "Overdue",
      value: stats.overdue,
      icon: AlertCircle,
      tone: overdueTone,
      tooltip:
        stats.overdue > 0
          ? `${stats.overdue} task${stats.overdue > 1 ? "s" : ""} past due date`
          : "No overdue tasks",
    },
    {
      key: "done",
      label: "Done",
      value: `${stats.completedPercent}%`,
      icon: CheckCircle2,
      tone: doneTone,
      tooltip: `${stats.completed} of ${stats.total} tasks completed (${stats.completedPercent}%)`,
    },
    ...(stats.recurring > 0 && !hideRecurringStat
      ? [
          {
            key: "recurring",
            label: "Recurring",
            value: stats.recurring,
            icon: Repeat,
            tone: "indigo" as const,
            tooltip: `${stats.recurring} recurring occurrence${stats.recurring !== 1 ? "s" : ""}`,
            onClick: onRecurringFilterClick,
          } satisfies StatItem,
        ]
      : []),
  ];

  function getProgressColor(pct: number) {
    if (pct >= 75) return "bg-emerald-500";
    if (pct >= 40) return "bg-amber-500";
    if (pct > 0) return "bg-orange-400";
    return "bg-muted-foreground/20";
  }

  const progressLabel =
    stats.total > 0
      ? `${stats.completedPercent}% done · ${stats.completed}/${stats.total} tasks`
      : null;

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className={cn(
          "flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5",
          className
        )}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-1">
          {items.map((item) => (
            <Tooltip key={item.key}>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <StatChip item={item} />
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-[220px] text-xs">{item.tooltip}</TooltipContent>
            </Tooltip>
          ))}
        </div>

        {stats.total > 0 && progressLabel && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="ml-auto flex min-w-0 max-w-full items-center gap-2 border-l border-border/40 pl-2">
                <div className="hidden h-1 w-14 shrink-0 overflow-hidden rounded-full bg-muted/70 sm:block lg:w-16">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500 ease-out",
                      getProgressColor(stats.completedPercent)
                    )}
                    style={{ width: `${Math.min(stats.completedPercent, 100)}%` }}
                  />
                </div>
                <span className="truncate text-[11px] font-medium tabular-nums text-muted-foreground">
                  {progressLabel}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="text-xs">
              {stats.completed} of {stats.total} tasks completed ({stats.completedPercent}%)
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
