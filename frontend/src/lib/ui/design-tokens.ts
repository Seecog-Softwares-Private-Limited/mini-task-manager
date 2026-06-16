import { cn } from "@/lib/utils";

/** Shared chip geometry — priority, due date, labels, stats, filters, badges */
export const APP_CHIP_BASE = cn(
  "inline-flex h-6 items-center gap-1 rounded-md border px-2",
  "text-[11px] font-medium leading-none",
  "transition-all duration-200"
);

export const APP_CHIP_ICON = "h-3 w-3 shrink-0 opacity-80";

export const APP_CHIP_NEUTRAL = cn(
  APP_CHIP_BASE,
  "border-border/50 bg-background/90 text-foreground shadow-sm",
  "hover:border-border/70 hover:bg-muted/25"
);

export const APP_CHIP_INTERACTIVE = cn(
  APP_CHIP_NEUTRAL,
  "cursor-pointer hover:brightness-[0.98]"
);

/** Uppercase meta labels (column sections, field labels) */
export const APP_LABEL_UPPER = cn(
  "text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground"
);

/** Kanban task card typography */
export const TASK_CARD_TITLE = cn(
  "line-clamp-2 text-[14px] font-semibold leading-[1.35] tracking-[-0.01em] text-foreground"
);

export const TASK_CARD_TITLE_DONE = cn(TASK_CARD_TITLE, "font-medium text-muted-foreground");

export const TASK_CARD_DESCRIPTION = cn(
  "line-clamp-2 text-[13px] font-normal leading-[1.45] text-muted-foreground"
);

/** Page / section heading helpers */
export const PAGE_TITLE = "text-2xl font-bold tracking-[-0.025em] text-foreground";

export const SECTION_TITLE = "text-base font-semibold tracking-[-0.015em] text-foreground";

export const CARD_TITLE = "text-sm font-semibold tracking-[-0.01em] text-foreground";
