"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function BoardCommandBar({
  className,
  selectors,
  actions,
  stats,
  toolbar,
}: {
  className?: string;
  selectors: ReactNode;
  actions?: ReactNode;
  stats?: ReactNode;
  toolbar?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "shrink-0 overflow-hidden rounded-xl border border-border/55 bg-card shadow-sm",
        className
      )}
    >
        <div className="flex flex-col gap-0">
        <div className="flex flex-col gap-1.5 px-2.5 py-1.5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 flex-1">{selectors}</div>
          {actions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-1 lg:pb-0">
              {actions}
            </div>
          ) : null}
        </div>
        {stats ? (
          <div className="border-t border-border/40 bg-muted/12 px-2.5 py-1">{stats}</div>
        ) : null}
        {toolbar ? (
          <div className="border-t border-border/40 px-2.5 py-1">{toolbar}</div>
        ) : null}
      </div>
    </div>
  );
}

/** Consistent label + control column for workspace / project pickers */
export function BoardSelectorField({
  label,
  htmlFor,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <label
        htmlFor={htmlFor}
        className="text-[10px] font-medium leading-none tracking-[0.02em] text-muted-foreground"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

export const BOARD_COMMAND_ACTION_BTN = cn(
  "h-[26px] gap-1 rounded-lg px-2 text-[11px] font-medium transition-all duration-200"
);
