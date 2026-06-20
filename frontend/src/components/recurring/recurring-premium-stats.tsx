"use client";

import { cn } from "@/lib/utils";
import type { RecurringTaskSummary, RecurringTemplateSummary, Task } from "@/types/api";
import {
  activeSeriesCount,
  countCompletedThisWeek,
  countDueToday,
} from "@/lib/recurring-board-utils";
import { computePlannerStreak } from "@/lib/planner-agenda-utils";
import { EXEC_PLANNER, EXEC_HEALTH_STYLES } from "@/lib/executive-planner-theme";
import type { ExecutiveHealthStatus } from "@/lib/executive-planner-theme";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Flame,
  Library,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

type StatChip = {
  key: string;
  label: string;
  value: string | number;
  sublabel?: string;
  icon: LucideIcon;
  accent: string;
  iconBg: string;
};

interface RecurringPremiumStatsProps {
  summary?: RecurringTaskSummary;
  tasks?: Task[];
  templates?: RecurringTemplateSummary[];
  completedPercent?: number;
  doneStatusId?: string;
  healthStatus?: ExecutiveHealthStatus;
  isLoading?: boolean;
  className?: string;
}

export function RecurringPremiumStats({
  summary,
  tasks = [],
  templates = [],
  completedPercent = 0,
  doneStatusId,
  healthStatus = "healthy",
  isLoading,
  className,
}: RecurringPremiumStatsProps) {
  const dueToday = countDueToday(tasks);
  const completedWeek = countCompletedThisWeek(tasks, doneStatusId);
  const activePlanners = activeSeriesCount(summary, templates);
  const missed = summary?.overdue ?? 0;
  const streak = computePlannerStreak(tasks, doneStatusId);
  const healthStyle = EXEC_HEALTH_STYLES[healthStatus];

  const chips: StatChip[] = [
    {
      key: "active",
      label: "Active Planners",
      value: activePlanners,
      sublabel: "Live series",
      icon: Library,
      accent: "text-foreground",
      iconBg: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
    },
    {
      key: "today",
      label: "Due Today",
      value: dueToday,
      sublabel: dueToday > 0 ? "On today's desk" : "Clear today",
      icon: Clock,
      accent: dueToday > 0 ? "text-sky-800 dark:text-sky-200" : "text-foreground",
      iconBg: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    },
    {
      key: "missed",
      label: "Missed Entries",
      value: missed,
      sublabel: missed > 0 ? "Needs catch-up" : "All caught up",
      icon: AlertCircle,
      accent: missed > 0 ? "text-orange-800 dark:text-orange-200" : "text-foreground",
      iconBg: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    },
    {
      key: "health",
      label: "Completion Health",
      value: `${completedPercent}%`,
      sublabel: healthStyle.label,
      icon: TrendingUp,
      accent:
        healthStatus === "healthy"
          ? "text-emerald-800 dark:text-emerald-200"
          : healthStatus === "at_risk"
            ? "text-amber-800 dark:text-amber-200"
            : "text-rose-800 dark:text-rose-200",
      iconBg:
        healthStatus === "healthy"
          ? "bg-emerald-500/10 text-emerald-600"
          : healthStatus === "at_risk"
            ? "bg-amber-500/10 text-amber-600"
            : "bg-rose-500/10 text-rose-600",
    },
    {
      key: "streak",
      label: "Streak",
      value: streak > 0 ? `${streak}d` : "—",
      sublabel: streak > 1 ? "Consistency building" : "Start a streak",
      icon: Flame,
      accent: streak > 0 ? "text-amber-800 dark:text-amber-200" : "text-muted-foreground",
      iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
    {
      key: "week",
      label: "Done This Week",
      value: completedWeek,
      sublabel: "Runs completed",
      icon: CheckCircle2,
      accent:
        completedWeek > 0
          ? "text-emerald-800 dark:text-emerald-200"
          : "text-foreground",
      iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
  ];

  return (
    <section
      className={cn(
        "grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6",
        className
      )}
      aria-label="Planner summary"
    >
      {chips.map((chip) => {
        const Icon = chip.icon;
        return (
          <div
            key={chip.key}
            className={cn(
              EXEC_PLANNER.plannerChip,
              EXEC_PLANNER.paperCardHover,
              "flex items-center gap-2.5 p-2.5"
            )}
          >
            <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", chip.iconBg)}>
              <Icon className="h-3.5 w-3.5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] font-medium text-muted-foreground">{chip.label}</p>
              {isLoading ? (
                <div className="mt-1 h-5 w-10 animate-pulse rounded bg-muted/50" />
              ) : (
                <p className={cn("text-lg font-bold tabular-nums leading-tight", chip.accent)}>
                  {chip.value}
                </p>
              )}
              <p className="truncate text-[9px] text-muted-foreground">{chip.sublabel}</p>
            </div>
          </div>
        );
      })}
    </section>
  );
}
