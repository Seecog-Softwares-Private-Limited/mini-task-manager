"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarDays, X } from "lucide-react";

interface DueDateFieldProps {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  hint?: string;
}

export function DueDateField({ value, onChange, disabled, hint }: DueDateFieldProps) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <CalendarDays className="h-3.5 w-3.5" /> Due Date
      </label>
      <div className="flex items-center gap-2">
        <Input
          type="date"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="h-10"
        />
        {!!value && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={() => onChange("")}
            disabled={disabled}
            aria-label="Clear due date"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {hint ? (
        <p className="text-[11px] leading-relaxed text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

