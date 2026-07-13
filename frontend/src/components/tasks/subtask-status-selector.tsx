"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SUBTASK_STATUS_OPTIONS,
  resolveSubtaskStatus,
  type SubtaskStatus,
} from "@/lib/subtask-status";
import { cn } from "@/lib/utils";
import { Check, ChevronDown } from "lucide-react";

/** Above sheet/drawer overlay (z-50). */
const DROPDOWN_Z = "z-[110]";

const fieldShell =
  "h-11 w-full justify-between rounded-xl border-0 bg-white/85 px-4 text-sm font-semibold tracking-tight text-foreground shadow-[inset_0_0_0_1px_rgba(15,23,42,0.08)] transition-[background-color,box-shadow] hover:bg-white hover:!text-foreground hover:shadow-[inset_0_0_0_1px_rgba(15,23,42,0.12),0_4px_12px_-6px_rgba(15,23,42,0.12)] data-[state=open]:!text-foreground focus-visible:!text-foreground dark:bg-white/[0.06] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] dark:hover:bg-white/[0.1] dark:hover:!text-foreground dark:data-[state=open]:!text-foreground";

const rowShell =
  "h-7 min-w-[6.75rem] max-w-[8.5rem] shrink-0 justify-between rounded-md border-0 bg-white/70 px-2 text-[11px] font-medium tracking-tight text-foreground/85 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)] backdrop-blur-sm transition-[background-color,box-shadow] hover:bg-white/90 hover:!text-foreground hover:shadow-[inset_0_0_0_1px_rgba(15,23,42,0.1)] data-[state=open]:bg-white data-[state=open]:!text-foreground focus-visible:!text-foreground dark:bg-white/[0.06] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] dark:hover:bg-white/[0.1]";

interface SubtaskStatusSelectorProps {
  value?: SubtaskStatus | string;
  completed?: boolean;
  onChange: (status: SubtaskStatus) => void;
  disabled?: boolean;
  /** `row` for compact checklist rows; `field` matches task status dropdown in sidebar. */
  variant?: "row" | "field";
}

export function SubtaskStatusSelector({
  value,
  completed,
  onChange,
  disabled,
  variant = "row",
}: SubtaskStatusSelectorProps) {
  const resolved = resolveSubtaskStatus({ status: value, completed });
  const selected =
    SUBTASK_STATUS_OPTIONS.find((option) => option.value === resolved) ??
    SUBTASK_STATUS_OPTIONS[0];

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(variant === "field" ? fieldShell : rowShell)}
          aria-label={selected ? `Subtask status ${selected.label}` : "Subtask status"}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <span
              className={cn(
                "h-2.5 w-2.5 shrink-0 rounded-full shadow-sm ring-2 ring-white/80 dark:ring-black/40",
                selected.dotClass
              )}
              aria-hidden
            />
            <span className="truncate">{selected.label}</span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={variant === "field" ? "start" : "end"}
        className={cn(
          "p-1",
          variant === "field"
            ? "w-[var(--radix-dropdown-menu-trigger-width)] min-w-[220px]"
            : "min-w-[200px]",
          DROPDOWN_Z
        )}
        sideOffset={6}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {SUBTASK_STATUS_OPTIONS.map((option) => {
          const isCurrent = option.value === selected.value;
          return (
            <DropdownMenuItem
              key={option.value}
              onSelect={(event) => {
                event.preventDefault();
                onChange(option.value);
              }}
              className="rounded-lg text-sm"
            >
              <span
                className={cn("mr-2 h-2.5 w-2.5 shrink-0 rounded-full", option.dotClass)}
                aria-hidden
              />
              <span className="flex-1">{option.label}</span>
              {isCurrent ? <Check className="h-3.5 w-3.5 shrink-0 text-primary" /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
