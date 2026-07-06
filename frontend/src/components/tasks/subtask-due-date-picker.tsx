"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CalendarDays, X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Above create-task modal overlay (z-[100]). */
const DROPDOWN_Z = "z-[110]";

interface SubtaskDueDatePickerProps {
  value?: string;
  onChange: (date?: string) => void;
  disabled?: boolean;
  completed?: boolean;
  /** `row` for compact checklist rows; `field` for expanded subtask editor. */
  variant?: "row" | "field";
}

function parseDueDateLocal(value?: string): Date | null {
  if (!value) return null;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dueDateInputValue(value?: string): string {
  if (!value) return "";
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
}

function isOverdue(value?: string, completed?: boolean): boolean {
  if (!value || completed) return false;
  const current = parseDueDateLocal(value);
  if (!current) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  current.setHours(0, 0, 0, 0);
  return current < today;
}

function formatDateLabel(value?: string, variant: "row" | "field" = "field"): string {
  const date = parseDueDateLocal(value);
  if (!date) return variant === "row" ? "" : "Due";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function SubtaskDueDatePicker({
  value,
  onChange,
  disabled,
  completed,
  variant = "field",
}: SubtaskDueDatePickerProps) {
  const overdue = isOverdue(value, completed);
  const dateLabel = formatDateLabel(value, variant);
  const rowAssigned = variant === "row" && Boolean(value);

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          disabled={disabled}
          className={cn(
            variant === "row"
              ? cn(
                  "h-7 w-7 shrink-0 rounded-full p-0 shadow-sm transition-[background-color,box-shadow,color]",
                  rowAssigned
                    ? overdue
                      ? "border border-destructive/35 bg-destructive/10 text-destructive hover:bg-destructive/15"
                      : "border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:border-rose-500/35 dark:bg-rose-500/10 dark:text-rose-400"
                    : "border border-border/60 bg-background text-muted-foreground hover:bg-muted/30"
                )
              : cn(
                  "h-8 rounded-full px-3 text-[11px] font-semibold shadow-sm ring-1 ring-border/25 transition-[background-color,box-shadow] hover:ring-border/40",
                  value
                    ? "bg-background/90 text-foreground"
                    : "bg-muted/35 text-muted-foreground ring-dashed ring-muted-foreground/30",
                  overdue && "bg-destructive/10 text-destructive ring-destructive/30"
                )
          )}
          aria-label={value ? `Due date ${dateLabel}` : "Set due date"}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <CalendarDays className="h-3.5 w-3.5 shrink-0" />
          {variant === "field" && dateLabel ? <span className="ml-1">{dateLabel}</span> : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={cn("w-64 p-3", DROPDOWN_Z)}
        sideOffset={8}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <DropdownMenuLabel className="px-0 pt-0 text-xs font-semibold">
          Subtask Due Date
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="space-y-3 pt-2">
          <Input
            type="date"
            value={dueDateInputValue(value)}
            onChange={(e) => onChange(e.target.value || undefined)}
            className="h-9 text-xs"
          />
          {value && (
            <Button
              type="button"
              variant="outline"
              className="h-8 w-full text-xs"
              onClick={() => onChange(undefined)}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Clear due date
            </Button>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
