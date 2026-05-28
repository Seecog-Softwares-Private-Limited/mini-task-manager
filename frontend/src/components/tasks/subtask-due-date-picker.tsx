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
}

function isOverdue(value?: string, completed?: boolean): boolean {
  if (!value || completed) return false;
  const today = new Date();
  const current = new Date(value);
  today.setHours(0, 0, 0, 0);
  current.setHours(0, 0, 0, 0);
  return current < today;
}

function formatDateLabel(value?: string): string {
  if (!value) return "Due";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Due";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function SubtaskDueDatePicker({
  value,
  onChange,
  disabled,
  completed,
}: SubtaskDueDatePickerProps) {
  const overdue = isOverdue(value, completed);

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          disabled={disabled}
          className={cn(
            "h-8 rounded-full px-3 text-[11px] font-semibold shadow-sm ring-1 ring-border/25 transition-[background-color,box-shadow] hover:ring-border/40",
            value
              ? "bg-background/90 text-foreground"
              : "bg-muted/35 text-muted-foreground ring-dashed ring-muted-foreground/30",
            overdue && "bg-destructive/10 text-destructive ring-destructive/30"
          )}
        >
          <CalendarDays className="mr-1 h-3.5 w-3.5" />
          {formatDateLabel(value)}
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
            value={value ?? ""}
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

