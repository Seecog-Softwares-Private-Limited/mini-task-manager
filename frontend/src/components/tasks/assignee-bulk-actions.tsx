"use client";

import { Check, UserRoundX, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AssigneeBulkActionsProps {
  filteredCount: number;
  allSelected: boolean;
  /** How many are currently selected (shown as "X of Y"). */
  selectedCount?: number;
  isSearchActive?: boolean;
  onToggleSelectAll: () => void;
  onClear?: () => void;
  disabled?: boolean;
  showSelectAll?: boolean;
  clearLabel?: string;
  selectAllLabel?: string;
  showPartialIndicator?: boolean;
  className?: string;
  /** Prevents kanban card drag/click when used inside task cards. */
  quickAction?: boolean;
}

export function AssigneeBulkActions({
  filteredCount,
  allSelected,
  selectedCount = 0,
  isSearchActive = false,
  onToggleSelectAll,
  onClear,
  disabled = false,
  showSelectAll = true,
  clearLabel = "Clear assignment",
  selectAllLabel = "Select all",
  showPartialIndicator = true,
  className,
  quickAction = false,
}: AssigneeBulkActionsProps) {
  const partialSelection =
    selectedCount > 0 && selectedCount < filteredCount && !allSelected;

  if (!showSelectAll && !onClear) return null;

  return (
    <div
      className={cn("px-2 pb-1 pt-0.5", className)}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="overflow-hidden rounded-lg border border-border/45 bg-muted/20 shadow-sm">
        {showSelectAll && filteredCount > 0 ? (
          <button
            type="button"
            disabled={disabled}
            onClick={onToggleSelectAll}
            {...(quickAction ? { "data-quick-action": true } : {})}
            className={cn(
              "flex w-full items-center gap-2.5 px-2.5 py-2.5 text-left transition-colors",
              "hover:bg-background/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25",
              disabled && "cursor-not-allowed opacity-50",
              allSelected && "bg-primary/[0.06]"
            )}
          >
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors",
                allSelected
                  ? "bg-primary/15 text-primary"
                  : partialSelection
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    : "bg-primary/10 text-primary"
              )}
            >
              <Users className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground">
                {allSelected ? selectAllLabel : "Select all"}
              </p>
              <p className="text-[10px] leading-snug text-muted-foreground">
                {isSearchActive
                  ? `${filteredCount} matching member${filteredCount === 1 ? "" : "s"}`
                  : `${filteredCount} member${filteredCount === 1 ? "" : "s"}`}
                {selectedCount > 0 ? (
                  <span className="text-foreground/70">
                    {" "}
                    · {selectedCount} of {filteredCount} selected
                  </span>
                ) : null}
              </p>
            </div>
            <span
              className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all duration-200",
                allSelected
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : showPartialIndicator && partialSelection
                    ? "border-amber-500/60 bg-amber-500/15"
                    : "border-border/80 bg-background"
              )}
              aria-hidden
            >
              {allSelected ? (
                <Check className="h-3 w-3" />
              ) : showPartialIndicator && partialSelection ? (
                <span className="h-1.5 w-1.5 rounded-sm bg-amber-600 dark:bg-amber-400" />
              ) : null}
            </span>
          </button>
        ) : null}

        {onClear ? (
          <>
            {showSelectAll && filteredCount > 0 ? (
              <div className="mx-2.5 border-t border-border/40" />
            ) : null}
            <button
              type="button"
              disabled={disabled}
              onClick={onClear}
              {...(quickAction ? { "data-quick-action": true } : {})}
              className={cn(
                "flex w-full items-center justify-center gap-1.5 px-2.5 py-2 text-[11px] font-medium text-muted-foreground transition-colors",
                "hover:bg-background/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25",
                disabled && "cursor-not-allowed opacity-50"
              )}
            >
              <UserRoundX className="h-3.5 w-3.5" />
              {clearLabel}
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
