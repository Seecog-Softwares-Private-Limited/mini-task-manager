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
import { cn } from "@/lib/utils";

type SubtaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

const PRIORITY_OPTIONS: Array<{
  value: SubtaskPriority;
  label: string;
  dotClass: string;
}> = [
  { value: "LOW", label: "Low", dotClass: "bg-emerald-500" },
  { value: "MEDIUM", label: "Medium", dotClass: "bg-amber-500" },
  { value: "HIGH", label: "High", dotClass: "bg-red-500" },
  { value: "CRITICAL", label: "Critical", dotClass: "bg-purple-500" },
];

interface SubtaskPrioritySelectorProps {
  value?: SubtaskPriority;
  onChange: (priority: SubtaskPriority) => void;
  disabled?: boolean;
}

export function SubtaskPrioritySelector({
  value = "MEDIUM",
  onChange,
  disabled,
}: SubtaskPrioritySelectorProps) {
  const selected = PRIORITY_OPTIONS.find((p) => p.value === value) ?? PRIORITY_OPTIONS[1];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          disabled={disabled}
          className="h-8 rounded-full bg-background/90 px-3 text-[11px] font-semibold text-foreground/90 shadow-sm ring-1 ring-border/25 transition-[box-shadow] hover:ring-border/40"
          aria-label={`Subtask priority ${selected.label}`}
        >
          <span className={cn("mr-1.5 h-2 w-2 rounded-full", selected.dotClass)} />
          {selected.label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-44 p-1"
        sideOffset={8}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <DropdownMenuLabel className="px-2 pb-1 text-xs font-semibold">
          Priority
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {PRIORITY_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onSelect={(event) => {
              event.preventDefault();
              onChange(option.value);
            }}
            className="rounded-md text-xs"
          >
            <span className={cn("mr-2 h-2 w-2 rounded-full", option.dotClass)} />
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

