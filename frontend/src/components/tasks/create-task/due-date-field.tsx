"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarDays, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CREATE_FIELD_LABEL } from "@/components/tasks/create-task/form-section";

interface DueDateFieldProps {
  value?: string;
  dueTime?: string;
  onChange: (value: string) => void;
  onDueTimeChange?: (value: string) => void;
  disabled?: boolean;
  hint?: string;
  label?: string;
}

function toInputDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dueTimeInputValue(value?: string): string {
  if (!value) return "";
  const match = String(value).match(/^([01]\d|2[0-3]):[0-5]\d/);
  return match ? match[0] : "";
}

function getQuickDates() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const thisWeek = new Date(today);
  const day = today.getDay();
  const daysUntilFriday = day <= 5 ? 5 - day : 5 + (7 - day);
  thisWeek.setDate(today.getDate() + daysUntilFriday);

  return {
    today: toInputDate(today),
    tomorrow: toInputDate(tomorrow),
    thisWeek: toInputDate(thisWeek),
  };
}

const QUICK_BTN = cn(
  "h-7 rounded-md border px-2 text-[11px] font-medium transition-all duration-200",
  "border-border/50 bg-background hover:bg-muted/40"
);

export function DueDateField({
  value,
  dueTime,
  onChange,
  onDueTimeChange,
  disabled,
  hint,
  label = "Due date",
}: DueDateFieldProps) {
  const quick = getQuickDates();
  const timeValue = dueTimeInputValue(dueTime);
  const activeQuick =
    value === quick.today
      ? "today"
      : value === quick.tomorrow
        ? "tomorrow"
        : value === quick.thisWeek
          ? "week"
          : value
            ? "custom"
            : null;

  const setDate = (next: string) => {
    onChange(next);
    if (!next) onDueTimeChange?.("");
  };

  return (
    <div className="space-y-2">
      <label className={cn(CREATE_FIELD_LABEL, "flex items-center gap-1.5")}>
        <CalendarDays className="h-3.5 w-3.5" /> {label}
      </label>

      <div className="flex flex-wrap gap-1">
        {(
          [
            { key: "today", label: "Today", date: quick.today },
            { key: "tomorrow", label: "Tomorrow", date: quick.tomorrow },
            { key: "week", label: "This week", date: quick.thisWeek },
          ] as const
        ).map((opt) => (
          <button
            key={opt.key}
            type="button"
            disabled={disabled}
            onClick={() => setDate(opt.date)}
            className={cn(
              QUICK_BTN,
              activeQuick === opt.key &&
                "border-violet-500/30 bg-violet-500/8 text-violet-800 ring-1 ring-violet-500/20 dark:text-violet-200"
            )}
          >
            {opt.label}
          </button>
        ))}
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!value) setDate(quick.today);
          }}
          className={cn(
            QUICK_BTN,
            activeQuick === "custom" &&
              "border-violet-500/30 bg-violet-500/8 text-violet-800 ring-1 ring-violet-500/20 dark:text-violet-200"
          )}
        >
          Custom
        </button>
      </div>

      <div className="flex items-center gap-2">
        <Input
          type="date"
          value={value ?? ""}
          onChange={(e) => setDate(e.target.value)}
          disabled={disabled}
          className="h-9 rounded-lg border-border/55 bg-background text-sm shadow-sm transition-all duration-200 focus-visible:ring-violet-500/20"
        />
        {!!value && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-lg text-muted-foreground transition-colors duration-200 hover:text-foreground"
            onClick={() => setDate("")}
            disabled={disabled}
            aria-label="Clear due date"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {value && onDueTimeChange ? (
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Due time <span className="font-normal">(optional)</span>
          </label>
          <div className="flex items-center gap-2">
            <Input
              type="time"
              value={timeValue}
              onChange={(e) => onDueTimeChange(e.target.value)}
              disabled={disabled}
              className="h-9 rounded-lg border-border/55 bg-background text-sm shadow-sm transition-all duration-200 focus-visible:ring-violet-500/20"
            />
            {timeValue ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 rounded-lg text-muted-foreground"
                onClick={() => onDueTimeChange("")}
                disabled={disabled}
                aria-label="Clear due time"
              >
                <X className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {hint ? (
        <p className="text-[11px] leading-relaxed text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
