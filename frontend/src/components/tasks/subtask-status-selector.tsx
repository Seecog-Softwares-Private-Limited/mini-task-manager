"use client";

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
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const DROPDOWN_Z = "z-[110]";

const STATUS_DOT_FALLBACK = [
  "bg-blue-500",
  "bg-amber-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-rose-500",
];

interface SubtaskStatusSelectorProps {
  statuses: WorkflowStatus[];
  value?: string;
  onChange: (statusId: string) => void;
  disabled?: boolean;
  completed?: boolean;
}

export function isDoneWorkflowStatus(status: WorkflowStatus): boolean {
  return status.type === "DONE" || status.name.toLowerCase() === "done";
}

export function defaultTodoStatusId(statuses: WorkflowStatus[]): string | undefined {
  return (
    statuses.find((s) => s.type === "TODO" || s.name.toLowerCase() === "to do")?.id ??
    statuses[0]?.id
  );
}

export function defaultDoneStatusId(statuses: WorkflowStatus[]): string | undefined {
  return statuses.find(isDoneWorkflowStatus)?.id;
}

export function resolveSubtaskStatusId(
  subtask: { statusId?: string; completed?: boolean },
  statuses: WorkflowStatus[]
): string | undefined {
  if (subtask.statusId && statuses.some((s) => s.id === subtask.statusId)) {
    return subtask.statusId;
  }
  if (subtask.completed) {
    return defaultDoneStatusId(statuses) ?? defaultTodoStatusId(statuses);
  }
  return defaultTodoStatusId(statuses);
}

export function SubtaskStatusSelector({
  statuses,
  value,
  onChange,
  disabled,
  completed,
}: SubtaskStatusSelectorProps) {
  const selected =
    statuses.find((s) => s.id === value) ??
    statuses.find((s) => s.id === resolveSubtaskStatusId({ statusId: value, completed }, statuses)) ??
    statuses[0];

  if (statuses.length === 0) {
    return (
      <Button
        type="button"
        variant="ghost"
        disabled
        className="h-8 rounded-full px-3 text-[11px] font-semibold text-muted-foreground ring-1 ring-dashed ring-muted-foreground/30"
      >
        Status
      </Button>
    );
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          disabled={disabled}
          className={cn(
            "h-8 max-w-[7.5rem] rounded-full px-3 text-[11px] font-semibold shadow-sm ring-1 ring-border/25 transition-[box-shadow] hover:ring-border/40",
            completed
              ? "bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 dark:text-emerald-400"
              : "bg-background/90 text-foreground/90"
          )}
          aria-label={selected ? `Subtask status ${selected.name}` : "Subtask status"}
        >
          {selected ? (
            <>
              <span
                className={cn(
                  "mr-1.5 h-2 w-2 shrink-0 rounded-full",
                  selected.color ||
                    STATUS_DOT_FALLBACK[
                      statuses.findIndex((s) => s.id === selected.id) % STATUS_DOT_FALLBACK.length
                    ]
                )}
              />
              <span className="truncate">{selected.name}</span>
            </>
          ) : (
            "Status"
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={cn("w-48 p-1", DROPDOWN_Z)}
        sideOffset={8}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <DropdownMenuLabel className="px-2 pb-1 text-xs font-semibold">Status</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {statuses.map((status, index) => {
          const isCurrent = status.id === selected?.id;
          return (
            <DropdownMenuItem
              key={status.id}
              onSelect={(event) => {
                event.preventDefault();
                onChange(status.id);
              }}
              className="rounded-md text-xs"
            >
              <span
                className={cn(
                  "mr-2 h-2 w-2 shrink-0 rounded-full",
                  status.color || STATUS_DOT_FALLBACK[index % STATUS_DOT_FALLBACK.length]
                )}
              />
              <span className="flex-1">{status.name}</span>
              {isCurrent ? <Check className="h-3.5 w-3.5 shrink-0 text-primary" /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
