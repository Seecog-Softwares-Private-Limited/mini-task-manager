"use client";

import { cn } from "@/lib/utils";
import type { RecurringTaskSummary, RecurringTemplateSummary, Task } from "@/types/api";
import {
  activeSeriesCount,
  aggregateRunHealth,
  countDueToday,
} from "@/lib/recurring-board-utils";
import { EXEC_PLANNER, EXEC_HEALTH_STYLES } from "@/lib/executive-planner-theme";
import type { ExecutiveHealthStatus } from "@/lib/executive-planner-theme";
import {
  AlertCircle,
  Clock,
  Info,
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
  healthStatus = "healthy",
  isLoading,
  className,
}: RecurringPremiumStatsProps) {
  const dueToday = countDueToday(tasks);
  const activeSeries = activeSeriesCount(summary, templates);
  // Completion Health + Missed Runs are derived from the project's series
  // aggregate so they stay consistent (completed runs / total generated runs).
  const runHealth = aggregateRunHealth(templates);
  const missed = templates.length > 0 ? runHealth.totalMissed : (summary?.overdue ?? 0);
  const hasData = templates.length > 0 ? runHealth.hasData : !!summary;
  const healthPercent = templates.length > 0 ? runHealth.healthPercent : completedPercent;
  const resolvedHealthStatus: ExecutiveHealthStatus = !hasData
    ? healthStatus
    : healthPercent >= 65
      ? "healthy"
      : healthPercent >= 35
        ? "at_risk"
        : "critical";
  const healthStyle = EXEC_HEALTH_STYLES[resolvedHealthStatus];
  const showInconsistentNote = !isLoading && activeSeries === 0 && missed > 0;

  const chips: StatChip[] = [
    {
      key: "active",
      label: "Active Series",
      value: activeSeries,
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
      label: "Missed Runs",
      value: missed,
      sublabel: missed > 0 ? "Needs catch-up" : "All caught up",
      icon: AlertCircle,
      accent: missed > 0 ? "text-orange-800 dark:text-orange-200" : "text-foreground",
      iconBg: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    },
    {
      key: "health",
      label: "Completion Health",
      value: hasData ? `${healthPercent}%` : "No data yet",
      sublabel: hasData ? healthStyle.label : "No runs generated",
      icon: TrendingUp,
      accent: !hasData
        ? "text-muted-foreground"
        : resolvedHealthStatus === "healthy"
          ? "text-emerald-800 dark:text-emerald-200"
          : resolvedHealthStatus === "at_risk"
            ? "text-amber-800 dark:text-amber-200"
            : "text-rose-800 dark:text-rose-200",
      iconBg: !hasData
        ? "bg-muted text-muted-foreground"
        : resolvedHealthStatus === "healthy"
          ? "bg-emerald-500/10 text-emerald-600"
          : resolvedHealthStatus === "at_risk"
            ? "bg-amber-500/10 text-amber-600"
            : "bg-rose-500/10 text-rose-600",
    },
  ];

  return (
    <section className={cn("flex flex-col gap-2", className)} aria-label="Planner summary">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
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
                  <p
                    className={cn(
                      "font-bold tabular-nums leading-tight",
                      typeof chip.value === "string" && /[a-z]/i.test(chip.value)
                        ? "text-sm"
                        : "text-lg",
                      chip.accent
                    )}
                  >
                    {chip.value}
                  </p>
                )}
                <p className="truncate text-[9px] text-muted-foreground">{chip.sublabel}</p>
              </div>
            </div>
          );
        })}
      </div>
      {showInconsistentNote ? (
        <p className="flex items-center gap-1.5 rounded-lg border border-amber-300/30 bg-amber-50/50 px-2.5 py-1.5 text-[11px] text-amber-800 dark:bg-amber-950/20 dark:text-amber-200">
          <Info className="h-3.5 w-3.5 shrink-0" />
          Missed runs may belong to archived or inactive recurring series.
        </p>
      ) : null}
    </section>
  );
}
