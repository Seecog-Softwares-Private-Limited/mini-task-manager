"use client";

import { cn } from "@/lib/utils";
import { formatShortDate } from "@/lib/recurring-board-utils";
import { toRecurrenceLabel } from "@/lib/recurrence-display";
import { cadenceAccentClass } from "@/lib/recurring-board-constants";
import type { RecurringTemplateSummary } from "@/types/api";
import { EXEC_PLANNER } from "@/lib/executive-planner-theme";
import { CalendarClock, PauseCircle, Repeat } from "lucide-react";

interface RecurringSeriesCardsProps {
  templates: RecurringTemplateSummary[];
  selectedTemplateId: string | null;
  onSelectTemplate: (templateId: string | null) => void;
  className?: string;
}

export function RecurringSeriesCards({
  templates,
  selectedTemplateId,
  onSelectTemplate,
  className,
}: RecurringSeriesCardsProps) {
  const active = templates.filter((t) => !t.isPaused);
  if (active.length === 0) return null;

  return (
    <div className={cn("flex gap-2 overflow-x-auto pb-1", className)} role="list" aria-label="Recurring series">
      <button
        type="button"
        onClick={() => onSelectTemplate(null)}
        className={cn(
          EXEC_PLANNER.paperCard,
          "shrink-0 px-3 py-2.5 text-left transition-all",
          selectedTemplateId === null && "ring-2 ring-primary/25"
        )}
      >
        <span className="text-xs font-semibold">All series</span>
        <span className="mt-0.5 block text-[10px] text-muted-foreground">{active.length} active</span>
      </button>
      {active.map((tpl) => {
        const nextLabel = formatShortDate(String(tpl.nextDueDate).slice(0, 10));
        return (
          <button
            key={tpl.id}
            type="button"
            onClick={() => onSelectTemplate(selectedTemplateId === tpl.id ? null : tpl.id)}
            className={cn(
              EXEC_PLANNER.paperCard,
              EXEC_PLANNER.paperCardHover,
              "shrink-0 min-w-[148px] max-w-[210px] border-l-4 px-3 py-2.5 text-left",
              cadenceAccentClass(tpl.repeatType),
              selectedTemplateId === tpl.id && "ring-2 ring-primary/25"
            )}
          >
            <div className="flex items-start gap-1.5">
              <Repeat className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
              <span className="line-clamp-2 text-xs font-semibold leading-tight">{tpl.title}</span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="rounded-full bg-muted px-1.5 py-0.5 font-medium">
                {toRecurrenceLabel(tpl.repeatType)}
              </span>
              {nextLabel ? (
                <span className="inline-flex items-center gap-0.5">
                  <CalendarClock className="h-2.5 w-2.5" />
                  Next {nextLabel}
                </span>
              ) : null}
            </div>
            {tpl.isPaused ? (
              <span className="mt-1 inline-flex items-center gap-0.5 text-[10px] text-amber-600">
                <PauseCircle className="h-2.5 w-2.5" /> Paused
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
