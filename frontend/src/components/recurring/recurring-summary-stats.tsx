"use client";

import { cn } from "@/lib/utils";
import type { RecurringTaskSummary } from "@/types/api";
import type { Task } from "@/types/api";
import {
  activeSeriesCount,
  countCompletedThisWeek,
  countDueToday,
} from "@/lib/recurring-board-utils";
import type { RecurringTemplateSummary } from "@/types/api";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Clock,
  ListTodo,
  PauseCircle,
  type LucideIcon,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const STAT_CHIP = cn(
  "inline-flex h-6 items-center gap-1 rounded-md border px-2 text-[11px] transition-all duration-200",
  "border-border/45 bg-background/80 shadow-sm"
);

type StatItem = {
  key: string;
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone: "neutral" | "violet" | "amber" | "warning" | "success" | "muted";
  tooltip: string;
};

const TONE_STYLES = {
  neutral: { chip: "hover:bg-muted/40", icon: "text-muted-foreground", value: "text-foreground", label: "text-muted-foreground" },
  violet: { chip: "border-violet-200/40 bg-violet-50/45 hover:bg-violet-50/65 dark:border-violet-500/15 dark:bg-violet-500/8", icon: "text-violet-600 dark:text-violet-400", value: "text-violet-800 dark:text-violet-300", label: "text-violet-700/80 dark:text-violet-400/80" },
  amber: { chip: "border-amber-200/40 bg-amber-50/45 hover:bg-amber-50/65 dark:border-amber-500/15 dark:bg-amber-500/8", icon: "text-amber-600 dark:text-amber-400", value: "text-amber-800 dark:text-amber-300", label: "text-amber-700/80 dark:text-amber-400/80" },
  warning: { chip: "border-orange-200/45 bg-orange-50/45 hover:bg-orange-50/65 dark:border-orange-500/15 dark:bg-orange-500/8", icon: "text-orange-600 dark:text-orange-400", value: "text-orange-800 dark:text-orange-300", label: "text-orange-700/80 dark:text-orange-400/80" },
  success: { chip: "border-emerald-200/40 bg-emerald-50/45 hover:bg-emerald-50/65 dark:border-emerald-500/15 dark:bg-emerald-500/8", icon: "text-emerald-600 dark:text-emerald-400", value: "text-emerald-800 dark:text-emerald-300", label: "text-emerald-700/80 dark:text-emerald-400/80" },
  muted: { chip: "hover:bg-muted/40", icon: "text-muted-foreground", value: "text-muted-foreground", label: "text-muted-foreground" },
} as const;

interface RecurringSummaryStatsProps {
  summary?: RecurringTaskSummary;
  tasks?: Task[];
  templates?: RecurringTemplateSummary[];
  completedPercent?: number;
  doneStatusId?: string;
  isLoading?: boolean;
  className?: string;
}

export function RecurringSummaryStats({
  summary,
  tasks = [],
  templates = [],
  completedPercent = 0,
  doneStatusId,
  isLoading,
  className,
}: RecurringSummaryStatsProps) {
  const dueToday = countDueToday(tasks);
  const completedWeek = countCompletedThisWeek(tasks, doneStatusId);
  const activeSeries = activeSeriesCount(summary, templates);
  const missed = summary?.overdue ?? 0;
  const paused = summary?.paused ?? 0;
  const dueWeek = summary?.dueThisWeek ?? 0;

  const items: StatItem[] = [
    { key: "active", label: "Active series", value: activeSeries, icon: ListTodo, tone: "violet", tooltip: `${activeSeries} active recurring series` },
    { key: "today", label: "Due today", value: dueToday, icon: Clock, tone: dueToday > 0 ? "amber" : "neutral", tooltip: `${dueToday} occurrence${dueToday !== 1 ? "s" : ""} due today` },
    { key: "week", label: "Due this week", value: dueWeek, icon: CalendarClock, tone: dueWeek > 0 ? "violet" : "neutral", tooltip: `${dueWeek} due within the next 7 days` },
    { key: "missed", label: "Missed", value: missed, icon: AlertCircle, tone: missed >= 3 ? "warning" : missed > 0 ? "amber" : "neutral", tooltip: missed > 0 ? `${missed} missed or overdue occurrence${missed !== 1 ? "s" : ""}` : "No missed occurrences" },
    { key: "paused", label: "Paused", value: paused, icon: PauseCircle, tone: paused > 0 ? "amber" : "muted", tooltip: paused > 0 ? `${paused} series paused` : "No paused series" },
    { key: "completed", label: "Done this week", value: completedWeek, icon: CheckCircle2, tone: completedWeek > 0 ? "success" : "neutral", tooltip: `${completedWeek} completed this week` },
  ];

  const progressLabel = `${completedPercent}% completed this week`;

  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn("flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5", className)}>
        <div className="flex min-w-0 flex-wrap items-center gap-1">
          {items.map((item) => {
            const tone = TONE_STYLES[item.tone];
            const Icon = item.icon;
            return (
              <Tooltip key={item.key}>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <div className={cn(STAT_CHIP, tone.chip)}>
                      <Icon className={cn("h-3 w-3 shrink-0", tone.icon)} />
                      {isLoading ? (
                        <span className="h-3 w-4 animate-pulse rounded bg-muted-foreground/20" />
                      ) : (
                        <span className={cn("font-semibold tabular-nums leading-none", tone.value)}>
                          {item.value}
                        </span>
                      )}
                      <span className={cn("hidden leading-none sm:inline", tone.label)}>{item.label}</span>
                    </div>
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-[220px] text-xs">{item.tooltip}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        {!isLoading && tasks.length > 0 ? (
          <span className="ml-auto truncate text-[11px] font-medium tabular-nums text-muted-foreground">
            {progressLabel}
          </span>
        ) : null}
      </div>
    </TooltipProvider>
  );
}
