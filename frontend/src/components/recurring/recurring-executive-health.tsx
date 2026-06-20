"use client";

import { cn } from "@/lib/utils";
import type { ExecutiveHealthMetrics } from "@/lib/recurring-board-utils";
import { EXEC_HEALTH_STYLES, EXEC_PLANNER } from "@/lib/executive-planner-theme";
import { Activity, AlertTriangle, Target, TrendingUp } from "lucide-react";

interface RecurringExecutiveHealthProps {
  metrics: ExecutiveHealthMetrics;
  className?: string;
}

export function RecurringExecutiveHealth({ metrics, className }: RecurringExecutiveHealthProps) {
  const health = EXEC_HEALTH_STYLES[metrics.healthStatus];

  const items = [
    {
      label: "Completion trend",
      value: `${metrics.completionRate}%`,
      hint: "Board completion",
      icon: TrendingUp,
    },
    {
      label: "On-time rate",
      value: `${metrics.onTimeRate}%`,
      hint: "Completed vs missed",
      icon: Target,
    },
    {
      label: "Missed runs",
      value: String(metrics.missedOccurrences),
      hint: metrics.missedOccurrences === 1 ? "occurrence" : "occurrences",
      icon: AlertTriangle,
    },
    {
      label: "Done this week",
      value: String(metrics.completedThisWeek),
      hint: "completed runs",
      icon: Activity,
    },
  ];

  return (
    <section
      className={cn(EXEC_PLANNER.paperCard, "shrink-0 px-4 py-3", className)}
      aria-label="Recurring workflow health"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className={EXEC_PLANNER.sectionLabel}>Workflow health</p>
          <p className="mt-0.5 text-sm font-semibold tracking-tight text-foreground">
            Executive pulse
          </p>
        </div>
        <div
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
            health.badge
          )}
        >
          <span className={cn("h-2 w-2 rounded-full", health.dot)} aria-hidden />
          {health.label}
        </div>
      </div>

      <p className="mb-3 text-[11px] text-muted-foreground">{health.description}</p>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="relative overflow-hidden rounded-xl border border-border/35 bg-background/60 px-3 py-2.5"
            >
              <div className="flex items-start gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted/40">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground">{item.label}</p>
                  <p className="text-base font-bold tabular-nums tracking-tight">{item.value}</p>
                  <p className="text-[10px] text-muted-foreground/75">{item.hint}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
