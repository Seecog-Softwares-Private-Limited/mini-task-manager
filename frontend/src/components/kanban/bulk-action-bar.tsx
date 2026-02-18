"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { WorkflowStatus } from "@/types/api";
import {
  X,
  ArrowRight,
  CheckSquare,
  Loader2,
} from "lucide-react";

interface BulkActionBarProps {
  selectedCount: number;
  statuses: WorkflowStatus[];
  onBulkMove: (statusId: string) => void;
  onDeselectAll: () => void;
  onExitSelection: () => void;
  isMoving?: boolean;
  className?: string;
}

export function BulkActionBar({
  selectedCount,
  statuses,
  onBulkMove,
  onDeselectAll,
  onExitSelection,
  isMoving = false,
  className,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
        "flex items-center gap-3 rounded-2xl border bg-card/95 backdrop-blur-md px-5 py-3 shadow-xl",
        "animate-in fade-in slide-in-from-bottom-4 duration-300",
        className
      )}
    >
      {/* Selection count */}
      <div className="flex items-center gap-2">
        <CheckSquare className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold tabular-nums">
          {selectedCount} selected
        </span>
      </div>

      <div className="h-5 w-px bg-border" />

      {/* Bulk move dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" className="h-8 gap-1.5" disabled={isMoving}>
            {isMoving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ArrowRight className="h-3.5 w-3.5" />
            )}
            Move to
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" side="top" className="w-48">
          <DropdownMenuLabel className="text-xs">Move {selectedCount} tasks to</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {statuses.map((s) => (
            <DropdownMenuItem key={s.id} onClick={() => onBulkMove(s.id)}>
              <ArrowRight className="mr-2 h-3.5 w-3.5" />
              {s.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Deselect */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 text-muted-foreground"
        onClick={onDeselectAll}
      >
        Deselect
      </Button>

      {/* Exit selection mode */}
      <button
        onClick={onExitSelection}
        className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground"
        aria-label="Exit selection mode"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
