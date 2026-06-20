"use client";

import { cn } from "@/lib/utils";
import type { RecurringTaskSummary, RecurringTemplateSummary, Task } from "@/types/api";
import { countDueToday } from "@/lib/recurring-board-utils";
import { computePlannerStreak } from "@/lib/planner-agenda-utils";
import { EXEC_PLANNER } from "@/lib/executive-planner-theme";
import { AlertCircle, Clock, Flame, PauseCircle, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RecurringCompactStatsProps {
  summary?: RecurringTaskSummary;
  tasks?: Task[];
  templates?: RecurringTemplateSummary[];
  doneStatusId?: string;
  isLoading?: boolean;
  className?: string;
  onDueTodayClick?: () => void;
  onMissedClick?: () => void;
  onResumeSeries?: (templateId: string) => void;
}

export function RecurringCompactStats({
  summary,
  tasks = [],
  templates = [],
  doneStatusId,
  isLoading,
  className,
  onDueTodayClick,
  onMissedClick,
  onResumeSeries,
}: RecurringCompactStatsProps) {
  const dueToday = countDueToday(tasks);
  const missed = summary?.overdue ?? 0;
  const streak = computePlannerStreak(tasks, doneStatusId);
  const pausedSeries = templates.filter((t) => t.isPaused);

  const items = [
    {
      key: "today",
      label: "Due today",
      value: dueToday,
      icon: Clock,
      accent: dueToday > 0 ? "text-sky-700 dark:text-sky-300" : "text-foreground",
      iconBg: "bg-sky-500/10 text-sky-600",
      onClick: onDueTodayClick,
    },
    {
      key: "missed",
      label: "Missed",
      value: missed,
      icon: AlertCircle,
      accent: missed > 0 ? "text-rose-700 dark:text-rose-300" : "text-foreground",
      iconBg: "bg-rose-500/10 text-rose-600",
      onClick: onMissedClick,
    },
    {
      key: "streak",
      label: "Streak",
      value: streak > 0 ? `${streak} days` : "—",
      icon: Flame,
      accent: streak > 0 ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground",
      iconBg: "bg-amber-500/10 text-amber-600",
      onClick: undefined,
    },
  ];

  return (
    <section
      className={cn("flex flex-col gap-2", className)}
      aria-label="Planner insights"
    >
      {pausedSeries.length > 0 && onResumeSeries ? (
        <div className="flex flex-col gap-1.5">
          {pausedSeries.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-amber-400/30 bg-amber-50/60 px-3 py-2 dark:bg-amber-950/20"
            >
              <div className="flex min-w-0 items-center gap-2">
                <PauseCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-amber-900 dark:text-amber-200">
                    "{t.title}" is paused
                  </p>
                  <p className="text-[10px] text-amber-700/70 dark:text-amber-300/60">
                    No new runs are being created — resume to continue generating daily tasks
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 shrink-0 gap-1.5 border-amber-400/40 bg-amber-50 px-3 text-[11px] font-semibold text-amber-800 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-200 dark:hover:bg-amber-900/50"
                onClick={() => onResumeSeries(t.id)}
              >
                <PlayCircle className="h-3.5 w-3.5" />
                Resume
              </Button>
            </div>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const Icon = item.icon;
        const Wrapper = item.onClick ? "button" : "div";
        return (
          <Wrapper
            key={item.key}
            type={item.onClick ? "button" : undefined}
            onClick={item.onClick}
            className={cn(
              EXEC_PLANNER.paperCard,
              EXEC_PLANNER.paperCardHover,
              "flex min-w-[7rem] flex-1 items-center gap-2.5 px-3 py-2.5 text-left sm:max-w-[12rem]",
              item.onClick && "cursor-pointer transition-shadow hover:shadow-md"
            )}
          >
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                item.iconBg
              )}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-medium text-muted-foreground">{item.label}</p>
              {isLoading ? (
                <div className="mt-1 h-5 w-8 animate-pulse rounded bg-muted/50" />
              ) : (
                <p className={cn("text-base font-bold tabular-nums leading-tight", item.accent)}>
                  {item.value}
                </p>
              )}
            </div>
          </Wrapper>
        );
      })}
      </div>
    </section>
  );
}
