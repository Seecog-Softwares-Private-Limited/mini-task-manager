"use client";

import { cn } from "@/lib/utils";
import { countDueToday } from "@/lib/recurring-board-utils";
import { getPlannerGreeting } from "@/lib/planner-agenda-utils";
import { EXEC_PLANNER } from "@/lib/executive-planner-theme";
import type { RecurringTaskSummary, Task } from "@/types/api";
import { BookOpen, Sparkles } from "lucide-react";

interface PlannerHeaderProps {
  summary?: RecurringTaskSummary;
  tasks?: Task[];
  projectName?: string;
  className?: string;
}

export function PlannerHeader({
  summary,
  tasks = [],
  projectName,
  className,
}: PlannerHeaderProps) {
  const greeting = getPlannerGreeting();
  const missed = summary?.overdue ?? 0;
  const dueToday = countDueToday(tasks);
  const paused = summary?.paused ?? 0;

  const summaryLine =
    missed === 0 && dueToday === 0
      ? "Your planner is clear — enjoy the calm."
      : `${greeting}, your planner has ${missed} missed ${missed === 1 ? "entry" : "entries"}${dueToday > 0 ? ` and ${dueToday} due today` : ""}.`;

  return (
    <header
      className={cn(
        EXEC_PLANNER.paperCard,
        "relative shrink-0 overflow-hidden px-4 py-3.5 sm:px-5",
        className
      )}
    >
      <div className="pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full bg-amber-400/10 blur-2xl" />
      <div className="pointer-events-none absolute -left-4 bottom-0 h-20 w-20 rounded-full bg-violet-400/8 blur-2xl" />
      <div className="relative flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300">
              <BookOpen className="h-4 w-4" aria-hidden />
            </div>
            <div>
              <p className={EXEC_PLANNER.sectionLabel}>Executive Planner Library</p>
              <h1 className="text-base font-semibold tracking-tight sm:text-lg">
                {projectName ? `${projectName} routines` : "Recurring routines"}
              </h1>
            </div>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{summaryLine}</p>
        </div>
        {paused > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-800 dark:text-amber-200">
            <Sparkles className="h-3 w-3" />
            {paused} paused {paused === 1 ? "series" : "series"}
          </span>
        ) : null}
      </div>
    </header>
  );
}
