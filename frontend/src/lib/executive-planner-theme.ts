/** Shared visual tokens for the Recurring Tasks Executive Planner Library module. */

export const EXEC_PLANNER = {
  page: "exec-planner-page planner-library-page",
  paperCard:
    "rounded-2xl border border-border/40 bg-gradient-to-br from-card via-card to-muted/15 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)] dark:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.35)]",
  paperCardHover:
    "transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-16px_rgba(15,23,42,0.12)]",
  bookCard:
    "rounded-xl border border-border/45 bg-gradient-to-br from-card via-card to-amber-50/20 shadow-sm dark:to-amber-950/10",
  bookCardHover:
    "transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-border/70",
  bookmarkTab:
    "relative rounded-t-lg border border-b-0 border-border/50 bg-muted/30 px-3 py-1.5 text-xs font-semibold transition-colors",
  bookmarkTabActive:
    "bg-card text-foreground shadow-sm after:absolute after:inset-x-0 after:-bottom-px after:h-px after:bg-card",
  sectionLabel:
    "text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80",
  plannerChip:
    "rounded-xl border border-border/40 bg-card/80 px-3 py-2 shadow-sm backdrop-blur-sm",
  timelineRule:
    "before:absolute before:left-0 before:top-0 before:h-full before:w-px before:bg-gradient-to-b before:from-border/0 before:via-border/60 before:to-border/0",
  entryCard:
    "group/entry rounded-xl border border-border/45 bg-card/90 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md",
} as const;

export type ExecutiveHealthStatus = "healthy" | "at_risk" | "critical";

export const EXEC_HEALTH_STYLES: Record<
  ExecutiveHealthStatus,
  { label: string; badge: string; dot: string; description: string }
> = {
  healthy: {
    label: "Healthy",
    badge:
      "border-emerald-300/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
    dot: "bg-emerald-500",
    description: "Recurring rhythm is on track",
  },
  at_risk: {
    label: "At Risk",
    badge:
      "border-amber-300/40 bg-amber-500/10 text-amber-900 dark:text-amber-200",
    dot: "bg-amber-500",
    description: "Some runs need attention soon",
  },
  critical: {
    label: "Critical",
    badge: "border-rose-300/40 bg-rose-500/10 text-rose-800 dark:text-rose-200",
    dot: "bg-rose-500",
    description: "Missed runs are impacting delivery",
  },
};
