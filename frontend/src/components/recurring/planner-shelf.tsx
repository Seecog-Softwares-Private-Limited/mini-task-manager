"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { formatShortDate } from "@/lib/recurring-board-utils";
import { toRecurrenceLabel } from "@/lib/recurrence-display";
import { cadenceAccentClass } from "@/lib/recurring-board-constants";
import { EXEC_PLANNER, EXEC_HEALTH_STYLES } from "@/lib/executive-planner-theme";
import type { RecurringTemplateSummary } from "@/types/api";
import {
  BookMarked,
  CalendarClock,
  Flame,
  Library,
  PauseCircle,
  Plus,
  Repeat,
  Sparkles,
} from "lucide-react";

export type ShelfCategory = "all" | "DAILY" | "WEEKLY" | "MONTHLY";

const SHELF_SECTIONS: {
  key: ShelfCategory;
  label: string;
  subtitle: string;
  icon: typeof Library;
}[] = [
  { key: "all", label: "All Planners", subtitle: "Every series", icon: Library },
  { key: "DAILY", label: "Daily Tasks", subtitle: "Every day rhythm", icon: Flame },
  { key: "WEEKLY", label: "Weekly Review", subtitle: "Weekly cadence", icon: BookMarked },
  { key: "MONTHLY", label: "Monthly Rituals", subtitle: "Monthly routines", icon: CalendarClock },
];

function templateHealth(tpl: RecurringTemplateSummary): "healthy" | "at_risk" | "critical" {
  if (tpl.isPaused) return "at_risk";
  if (tpl.upcoming === 0 && tpl.completed === 0) return "at_risk";
  return "healthy";
}

interface PlannerShelfProps {
  templates: RecurringTemplateSummary[];
  selectedTemplateId: string | null;
  selectedCategory: ShelfCategory;
  onSelectTemplate: (templateId: string | null) => void;
  onSelectCategory: (category: ShelfCategory) => void;
  /** When provided, clicking a series card opens it (manage view) instead of toggling selection. */
  onOpenSeries?: (template: RecurringTemplateSummary) => void;
  /** When provided, the empty state shows a "New recurring task" call-to-action. */
  onCreateSeries?: () => void;
  variant?: "sidebar" | "grid";
  className?: string;
}

export function PlannerShelf({
  templates,
  selectedTemplateId,
  selectedCategory,
  onSelectTemplate,
  onSelectCategory,
  onOpenSeries,
  onCreateSeries,
  variant = "sidebar",
  className,
}: PlannerShelfProps) {
  const filteredTemplates =
    selectedCategory === "all"
      ? templates
      : templates.filter((t) => t.repeatType === selectedCategory);

  const activeCount = templates.filter((t) => !t.isPaused).length;

  return (
    <aside
      className={cn(
        variant === "sidebar" && "hidden w-[240px] shrink-0 xl:flex xl:flex-col",
        variant === "grid" && "flex min-h-0 flex-1 flex-col",
        className
      )}
      aria-label="Planner shelf"
    >
      <div
        className={cn(
          EXEC_PLANNER.paperCard,
          "flex min-h-0 flex-1 flex-col overflow-hidden",
          variant === "sidebar" && "max-h-full"
        )}
      >
        <div className="shrink-0 border-b border-border/40 px-3 py-3">
          <p className={EXEC_PLANNER.sectionLabel}>Planner Shelf</p>
          <p className="mt-0.5 text-sm font-semibold tracking-tight">Your recurring library</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {activeCount} active {activeCount === 1 ? "planner" : "planners"}
          </p>
        </div>

        <nav className="shrink-0 space-y-0.5 border-b border-border/35 p-2">
          {SHELF_SECTIONS.map(({ key, label, subtitle, icon: Icon }) => {
            const count =
              key === "all"
                ? templates.length
                : templates.filter((t) => t.repeatType === key).length;
            if (key !== "all" && count === 0) return null;
            const active = selectedCategory === key && selectedTemplateId === null;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  onSelectCategory(key);
                  onSelectTemplate(null);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors",
                  active
                    ? "bg-primary/8 text-foreground ring-1 ring-primary/15"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold">{label}</span>
                  <span className="block truncate text-[10px] opacity-80">{subtitle}</span>
                </span>
                <span className="text-[10px] tabular-nums">{count}</span>
              </button>
            );
          })}
        </nav>

        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto p-2",
            variant === "grid" && "grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2"
          )}
        >
          {filteredTemplates.length === 0 ? (
            <div className="col-span-full flex flex-col items-center rounded-xl border-2 border-dashed border-border/50 px-4 py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                {templates.length === 0 ? (
                  <Sparkles className="h-6 w-6 text-primary" />
                ) : (
                  <Library className="h-6 w-6 text-primary/70" />
                )}
              </div>
              {templates.length === 0 ? (
                <>
                  <p className="mt-3 text-sm font-semibold">Start your recurring library</p>
                  <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                    A recurring series automatically generates runs on a schedule —
                    daily standups, weekly reviews, monthly reports. Create your first
                    one to get going.
                  </p>
                  {onCreateSeries ? (
                    <Button size="sm" className="mt-4 gap-1.5" onClick={onCreateSeries}>
                      <Plus className="h-3.5 w-3.5" /> New recurring task
                    </Button>
                  ) : null}
                </>
              ) : (
                <>
                  <p className="mt-3 text-sm font-medium">No planners in this section</p>
                  <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                    Nothing matches this cadence yet. Switch to “All Planners”, or add a
                    new series.
                  </p>
                  <div className="mt-4 flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => {
                        onSelectCategory("all");
                        onSelectTemplate(null);
                      }}
                    >
                      <Library className="h-3.5 w-3.5" /> All Planners
                    </Button>
                    {onCreateSeries ? (
                      <Button size="sm" className="gap-1.5" onClick={onCreateSeries}>
                        <Plus className="h-3.5 w-3.5" /> New recurring task
                      </Button>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          ) : (
            filteredTemplates.map((tpl) => (
              <PlannerBookCard
                key={tpl.id}
                template={tpl}
                selected={selectedTemplateId === tpl.id}
                onClick={() =>
                  onOpenSeries
                    ? onOpenSeries(tpl)
                    : onSelectTemplate(selectedTemplateId === tpl.id ? null : tpl.id)
                }
              />
            ))
          )}
        </div>
      </div>
    </aside>
  );
}

function PlannerBookCard({
  template,
  selected,
  onClick,
}: {
  template: RecurringTemplateSummary;
  selected: boolean;
  onClick: () => void;
}) {
  const health = templateHealth(template);
  const healthStyle = EXEC_HEALTH_STYLES[health];
  const nextLabel = formatShortDate(String(template.nextDueDate).slice(0, 10));

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        EXEC_PLANNER.bookCard,
        EXEC_PLANNER.bookCardHover,
        "w-full border-l-[3px] px-3 py-2.5 text-left",
        cadenceAccentClass(template.repeatType),
        selected && "ring-2 ring-primary/25"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-1.5">
          <Repeat className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
          <span className="line-clamp-2 text-xs font-semibold leading-snug">{template.title}</span>
        </div>
        <span
          className={cn("mt-0.5 h-2 w-2 shrink-0 rounded-full", healthStyle.dot)}
          title={healthStyle.label}
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
        <span className="rounded-md bg-muted/60 px-1.5 py-0.5 font-medium">
          {toRecurrenceLabel(template.repeatType)}
        </span>
        {nextLabel ? (
          <span className="inline-flex items-center gap-0.5">
            <CalendarClock className="h-2.5 w-2.5" />
            Next {nextLabel}
          </span>
        ) : null}
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[10px]">
        <span className="text-muted-foreground">{template.upcoming} upcoming</span>
        {template.isPaused ? (
          <span className="inline-flex items-center gap-0.5 text-amber-600">
            <PauseCircle className="h-2.5 w-2.5" /> Paused
          </span>
        ) : (
          <span className={cn("font-medium", healthStyle.badge, "rounded px-1.5 py-0.5 border")}>
            {healthStyle.label}
          </span>
        )}
      </div>
    </button>
  );
}

export { SHELF_SECTIONS };
