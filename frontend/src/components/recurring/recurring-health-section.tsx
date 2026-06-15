"use client";

import { cn } from "@/lib/utils";
import type { RecurringHealthMetrics } from "@/lib/recurring-board-utils";
import { Activity, AlertTriangle, PauseCircle, TrendingUp } from "lucide-react";

interface RecurringHealthSectionProps {
  metrics: RecurringHealthMetrics;
  className?: string;
}

export function RecurringHealthSection({ metrics, className }: RecurringHealthSectionProps) {
  const cards = [
    {
      label: "Completion rate",
      value: `${metrics.completionRate}%`,
      icon: TrendingUp,
      tone: metrics.completionRate >= 75 ? "text-emerald-600" : "text-muted-foreground",
    },
    {
      label: "Missed occurrences",
      value: String(metrics.missedOccurrences),
      icon: AlertTriangle,
      tone: metrics.missedOccurrences > 0 ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground",
    },
    {
      label: "Paused series",
      value: String(metrics.pausedSeries),
      icon: PauseCircle,
      tone: metrics.pausedSeries > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
    },
    {
      label: "Most delayed",
      value:
        metrics.mostDelayedTitle && metrics.mostDelayedDays > 0
          ? `${metrics.mostDelayedDays}d · ${metrics.mostDelayedTitle}`
          : "None",
      icon: Activity,
      tone: metrics.mostDelayedDays >= 3 ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground",
      truncate: true,
    },
  ];

  return (
    <section
      className={cn(
        "shrink-0 rounded-xl border border-border/50 bg-card/80 px-3 py-2.5 shadow-sm",
        className
      )}
      aria-label="Recurring health"
    >
      <h3 className="mb-2 text-[11px] font-medium text-muted-foreground">Recurring health</h3>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="flex items-center gap-2 rounded-lg border border-border/40 bg-muted/10 px-2.5 py-2 transition-colors duration-200"
            >
              <Icon className={cn("h-3.5 w-3.5 shrink-0", card.tone)} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-muted-foreground">{card.label}</p>
                <p
                  className={cn(
                    "truncate text-[12px] font-semibold tabular-nums leading-tight",
                    card.tone
                  )}
                  title={card.truncate ? String(card.value) : undefined}
                >
                  {card.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
