"use client";

import { useMemo, useState, type ReactNode } from "react";
import type {
  FieldErrors,
  UseFieldArrayAppend,
  UseFieldArrayRemove,
  UseFormRegister,
  UseFormSetValue,
} from "react-hook-form";
import {
  CalendarClock,
  ChevronDown,
  ListChecks,
  Plus,
  Repeat,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { generateClientId } from "@/lib/generate-client-id";
import type { TaskRecurrenceConfig } from "@/types/api";
import { recurrenceSummary, recurrenceEnd } from "@/lib/recurrence-display";
import {
  computeNextRuns,
  formatRunDate,
  formatRunTime,
} from "@/lib/recurrence-preview";
import { SubtaskAssigneeSelector } from "@/components/tasks/subtask-assignee-selector";
import {
  SubtaskPrioritySelector,
  type SubtaskPriority,
} from "@/components/tasks/subtask-priority-selector";
import type { SubtaskItem } from "@/components/tasks/create-task/subtasks-editor";

const FIELD_LABEL = "text-[11px] font-medium leading-none text-muted-foreground";
const SELECT_CLASS =
  "h-9 w-full rounded-lg border border-border/60 bg-background px-3 text-sm transition-colors focus-visible:border-violet-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/15";

const WEEK_DAYS = [
  { label: "S", full: "Sun", value: 0 },
  { label: "M", full: "Mon", value: 1 },
  { label: "T", full: "Tue", value: 2 },
  { label: "W", full: "Wed", value: 3 },
  { label: "T", full: "Thu", value: 4 },
  { label: "F", full: "Fri", value: 5 },
  { label: "S", full: "Sat", value: 6 },
];

const FREQUENCY_SEGMENTS: Array<{
  value: NonNullable<TaskRecurrenceConfig["repeat"]>;
  label: string;
}> = [
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "CUSTOM", label: "Custom" },
];

/* ------------------------------------------------------------------ */
/* Section card chrome                                                 */
/* ------------------------------------------------------------------ */

export function PlannerSectionCard({
  icon,
  title,
  description,
  action,
  children,
  className,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-border/55 bg-card/60 p-3.5 shadow-sm",
        className
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-300">
            {icon}
          </span>
          <div className="space-y-0.5">
            <h3 className="text-[13px] font-semibold tracking-tight">{title}</h3>
            {description ? (
              <p className="text-[11px] text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function PlannerCollapsibleCard({
  icon,
  title,
  description,
  defaultOpen = false,
  children,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-xl border border-border/55 bg-card/60 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 rounded-xl px-3.5 py-3 text-left transition-colors hover:bg-muted/30"
      >
        <span className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            {icon}
          </span>
          <span className="space-y-0.5">
            <span className="block text-[13px] font-semibold tracking-tight">{title}</span>
            {description ? (
              <span className="block text-[11px] text-muted-foreground">{description}</span>
            ) : null}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      {open ? <div className="border-t border-border/50 px-3.5 py-3.5">{children}</div> : null}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Repeat schedule control                                             */
/* ------------------------------------------------------------------ */

function normalizeSchedule(value?: TaskRecurrenceConfig): TaskRecurrenceConfig {
  return {
    repeat: value?.repeat,
    interval: value?.interval ?? 1,
    weeklyDays: value?.weeklyDays ?? [],
    monthlyMode: value?.monthlyMode ?? "DAY_OF_MONTH",
    dayOfMonth: value?.dayOfMonth ?? 1,
    nthWeek: value?.nthWeek ?? 1,
    weekday: value?.weekday ?? 1,
    monthOfYear: value?.monthOfYear ?? 1,
    dayOfYearMonth: value?.dayOfYearMonth ?? 1,
    customUnit: value?.customUnit ?? "DAY",
    endType: value?.endType ?? "NEVER",
    endDate: value?.endDate,
    endAfterOccurrences: value?.endAfterOccurrences ?? 52,
    createDaysBeforeDue: value?.createDaysBeforeDue ?? 0,
    dueLogic: value?.dueLogic ?? "DUE_DATE",
    dueTime: value?.dueTime,
    skipWeekends: value?.skipWeekends ?? false,
    completionRule: value?.completionRule ?? "ALL_CHECKLIST",
  };
}

const intervalUnitLabel: Record<string, string> = {
  DAILY: "day(s)",
  WEEKLY: "week(s)",
  MONTHLY: "month(s)",
  YEARLY: "year(s)",
  CUSTOM: "",
};

export function RepeatScheduleControl({
  value,
  onChange,
  disabled,
  error,
}: {
  value?: TaskRecurrenceConfig;
  onChange: (next: TaskRecurrenceConfig) => void;
  disabled?: boolean;
  error?: string | null;
}) {
  const state = normalizeSchedule(value);
  const repeat = state.repeat;

  const patch = (next: Partial<TaskRecurrenceConfig>) => {
    onChange({ ...state, ...next });
  };

  return (
    <div className="space-y-3.5">
      <div className="space-y-1.5">
        <Label className={FIELD_LABEL}>Frequency</Label>
        <div
          role="tablist"
          aria-label="Repeat frequency"
          className={cn(
            "grid grid-cols-4 gap-1 rounded-lg border bg-muted/30 p-1",
            error ? "border-destructive/50" : "border-border/50"
          )}
        >
          {FREQUENCY_SEGMENTS.map((seg) => {
            const active = repeat === seg.value;
            return (
              <button
                key={seg.value}
                type="button"
                role="tab"
                aria-selected={active}
                disabled={disabled}
                onClick={() => patch({ repeat: seg.value })}
                className={cn(
                  "rounded-md px-2 py-1.5 text-xs font-medium transition-all duration-200",
                  active
                    ? "bg-background text-foreground shadow-sm ring-1 ring-border/60"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {seg.label}
              </button>
            );
          })}
        </div>
        {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
      </div>

      {repeat ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className={FIELD_LABEL}>
                Repeat every {intervalUnitLabel[repeat] ? null : ""}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={state.interval ?? 1}
                  disabled={disabled}
                  onChange={(e) =>
                    patch({ interval: Math.max(1, Number(e.target.value) || 1) })
                  }
                  className="h-9 w-20"
                />
                {repeat === "CUSTOM" ? (
                  <select
                    value={state.customUnit ?? "DAY"}
                    disabled={disabled}
                    onChange={(e) =>
                      patch({
                        customUnit: e.target
                          .value as TaskRecurrenceConfig["customUnit"],
                      })
                    }
                    className={cn(SELECT_CLASS, "flex-1")}
                  >
                    <option value="DAY">Day(s)</option>
                    <option value="WEEK">Week(s)</option>
                    <option value="MONTH">Month(s)</option>
                    <option value="YEAR">Year(s)</option>
                  </select>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {intervalUnitLabel[repeat]}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className={FIELD_LABEL}>Due time (optional)</Label>
              <Input
                type="time"
                value={state.dueTime ?? ""}
                disabled={disabled}
                onChange={(e) => {
                  const next = e.target.value || undefined;
                  patch({
                    dueTime: next,
                    dueLogic: next ? "DUE_TIME" : "DUE_DATE",
                  });
                }}
                className="h-9"
              />
            </div>
          </div>

          {repeat === "WEEKLY" ? (
            <div className="space-y-1.5">
              <Label className={FIELD_LABEL}>On these days</Label>
              <div className="flex flex-wrap gap-1.5">
                {WEEK_DAYS.map((d, idx) => {
                  const active = (state.weeklyDays ?? []).includes(d.value);
                  return (
                    <button
                      key={`${d.value}-${idx}`}
                      type="button"
                      disabled={disabled}
                      aria-label={d.full}
                      onClick={() => {
                        const current = new Set(state.weeklyDays ?? []);
                        if (current.has(d.value)) current.delete(d.value);
                        else current.add(d.value);
                        patch({
                          weeklyDays: Array.from(current).sort((a, b) => a - b),
                        });
                      }}
                      className={cn(
                        "h-8 w-8 rounded-full border text-xs font-semibold transition-all",
                        active
                          ? "border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300"
                          : "border-border/60 bg-background text-muted-foreground hover:bg-muted/40"
                      )}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground/80">
                Leave empty to repeat on the start day each week.
              </p>
            </div>
          ) : null}

          {repeat === "MONTHLY" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className={FIELD_LABEL}>Monthly rule</Label>
                <select
                  value={state.monthlyMode ?? "DAY_OF_MONTH"}
                  disabled={disabled}
                  onChange={(e) =>
                    patch({
                      monthlyMode: e.target
                        .value as TaskRecurrenceConfig["monthlyMode"],
                    })
                  }
                  className={SELECT_CLASS}
                >
                  <option value="DAY_OF_MONTH">On day of month</option>
                  <option value="LAST_DAY">On last day</option>
                  <option value="NTH_WEEKDAY">On nth weekday</option>
                </select>
              </div>
              {state.monthlyMode === "DAY_OF_MONTH" ? (
                <div className="space-y-1.5">
                  <Label className={FIELD_LABEL}>Day of month</Label>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    value={state.dayOfMonth ?? 1}
                    disabled={disabled}
                    onChange={(e) => patch({ dayOfMonth: Number(e.target.value) || 1 })}
                    className="h-9"
                  />
                </div>
              ) : null}
              {state.monthlyMode === "NTH_WEEKDAY" ? (
                <>
                  <div className="space-y-1.5">
                    <Label className={FIELD_LABEL}>Week</Label>
                    <select
                      value={state.nthWeek ?? 1}
                      disabled={disabled}
                      onChange={(e) => patch({ nthWeek: Number(e.target.value) })}
                      className={SELECT_CLASS}
                    >
                      <option value={1}>First</option>
                      <option value={2}>Second</option>
                      <option value={3}>Third</option>
                      <option value={4}>Fourth</option>
                      <option value={-1}>Last</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className={FIELD_LABEL}>Weekday</Label>
                    <select
                      value={state.weekday ?? 1}
                      disabled={disabled}
                      onChange={(e) => patch({ weekday: Number(e.target.value) })}
                      className={SELECT_CLASS}
                    >
                      {WEEK_DAYS.map((d, idx) => (
                        <option key={`${d.value}-${idx}`} value={d.value}>
                          {d.full}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className={FIELD_LABEL}>Ends</Label>
              <select
                value={state.endType ?? "NEVER"}
                disabled={disabled}
                onChange={(e) =>
                  patch({ endType: e.target.value as TaskRecurrenceConfig["endType"] })
                }
                className={SELECT_CLASS}
              >
                <option value="NEVER">Never</option>
                <option value="ON_DATE">On date</option>
                <option value="AFTER_OCCURRENCES">After occurrences</option>
              </select>
            </div>
            {state.endType === "ON_DATE" ? (
              <div className="space-y-1.5">
                <Label className={FIELD_LABEL}>End date</Label>
                <Input
                  type="date"
                  value={state.endDate ?? ""}
                  disabled={disabled}
                  onChange={(e) => patch({ endDate: e.target.value || undefined })}
                  className="h-9"
                />
              </div>
            ) : null}
            {state.endType === "AFTER_OCCURRENCES" ? (
              <div className="space-y-1.5">
                <Label className={FIELD_LABEL}>Number of runs</Label>
                <Input
                  type="number"
                  min={1}
                  max={10000}
                  value={state.endAfterOccurrences ?? 52}
                  disabled={disabled}
                  onChange={(e) =>
                    patch({
                      endAfterOccurrences: Math.max(1, Number(e.target.value) || 1),
                    })
                  }
                  className="h-9"
                />
              </div>
            ) : null}
          </div>
          <p className="text-[10px] text-muted-foreground/75">
            Timezone:{" "}
            {Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, " ")}
          </p>
        </>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Live recurrence preview                                             */
/* ------------------------------------------------------------------ */

export function RecurrencePreviewCard({
  recurrence,
  startDate,
}: {
  recurrence?: TaskRecurrenceConfig;
  startDate?: string;
}) {
  const hasFrequency = Boolean(recurrence?.repeat && recurrence.repeat !== "NONE");
  const hasStartDate = Boolean(startDate);
  const summary = recurrenceSummary(recurrence);
  const endLabel = recurrence ? recurrenceEnd(recurrence) : null;
  const runs = useMemo(
    () => (hasStartDate ? computeNextRuns(recurrence, startDate, 3) : []),
    [recurrence, startDate, hasStartDate]
  );
  const dueTimeLabel = formatRunTime(recurrence?.dueTime);

  if (!hasFrequency) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-dashed border-border/60 bg-muted/20 px-3.5 py-3 text-[12px] text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-violet-500" />
        Pick a frequency to preview the schedule and upcoming runs.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-violet-500/20 bg-violet-500/[0.04] p-3.5">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-4 w-4 shrink-0 text-violet-600 dark:text-violet-300" />
        <p className="text-[12px] font-medium text-foreground">
          {summary ?? "Recurring schedule"}
        </p>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        {hasStartDate ? (
          <span>
            Starts:{" "}
            <span className="font-medium text-foreground/85">
              {formatRunDate(new Date(startDate!))}
            </span>
          </span>
        ) : (
          <span className="text-amber-700/90 dark:text-amber-300/90">
            Select a start date to preview upcoming runs.
          </span>
        )}
        {dueTimeLabel ? (
          <span>
            Due time:{" "}
            <span className="font-medium text-foreground/85">{dueTimeLabel}</span>
          </span>
        ) : null}
        {endLabel ? (
          <span>
            End rule:{" "}
            <span className="font-medium text-foreground/85">{endLabel}</span>
          </span>
        ) : null}
      </div>
      {hasStartDate && runs.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">
            Next runs
          </p>
          <div className="flex flex-wrap gap-1.5">
            {runs.map((run, idx) => (
              <span
                key={run.toISOString()}
                className="inline-flex items-center gap-1.5 rounded-md border border-border/50 bg-background px-2 py-1 text-[11px] font-medium"
              >
                <span className="text-violet-600 dark:text-violet-300">#{idx + 1}</span>
                {formatRunDate(run)}
              </span>
            ))}
          </div>
        </div>
      ) : hasStartDate ? (
        <p className="text-[11px] text-muted-foreground">
          No upcoming runs within the end rule.
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Checklist                                                           */
/* ------------------------------------------------------------------ */

function formatChecklistDueSummary(item?: SubtaskItem): string {
  const parts: string[] = [];
  const priority = item?.priority ?? "MEDIUM";
  parts.push(priority.charAt(0) + priority.slice(1).toLowerCase());
  const offset = item?.dueOffsetDays ?? 0;
  if (offset === 0) parts.push("Same day");
  else if (offset === 1) parts.push("+1 day");
  else if (offset === 2) parts.push("+2 days");
  else parts.push(`+${offset} days`);
  const timeLabel = formatRunTime(item?.dueTime);
  if (timeLabel) parts.push(timeLabel);
  return parts.join(" · ");
}

const OFFSET_PRESETS = [
  { value: 0, label: "Same day" },
  { value: 1, label: "+1 day" },
  { value: 2, label: "+2 days" },
] as const;

function isCustomOffset(offset: number): boolean {
  return !OFFSET_PRESETS.some((p) => p.value === offset);
}

function ChecklistRelativeDueControl({
  index,
  current,
  setValue,
  disabled,
}: {
  index: number;
  current?: SubtaskItem;
  setValue: UseFormSetValue<any>;
  disabled?: boolean;
}) {
  const offset = current?.dueOffsetDays ?? 0;
  const custom = isCustomOffset(offset);

  const setOffset = (next: number) => {
    setValue(`subtasks.${index}.dueOffsetDays` as const, Math.max(0, next), {
      shouldDirty: true,
    });
  };

  return (
    <div className="space-y-2.5 rounded-lg border border-border/45 bg-muted/15 p-2.5">
      <div className="space-y-1.5">
        <Label className={FIELD_LABEL}>Due relative to run</Label>
        <div className="flex flex-wrap gap-1">
          {OFFSET_PRESETS.map((preset) => {
            const active = !custom && offset === preset.value;
            return (
              <button
                key={preset.value}
                type="button"
                disabled={disabled}
                onClick={() => setOffset(preset.value)}
                className={cn(
                  "rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
                  active
                    ? "border-violet-500/35 bg-violet-500/10 text-violet-700 dark:text-violet-300"
                    : "border-border/55 bg-background text-muted-foreground hover:text-foreground"
                )}
              >
                {preset.label}
              </button>
            );
          })}
          <button
            type="button"
            disabled={disabled}
            onClick={() => setOffset(custom ? offset : 3)}
            className={cn(
              "rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
              custom
                ? "border-violet-500/35 bg-violet-500/10 text-violet-700 dark:text-violet-300"
                : "border-border/55 bg-background text-muted-foreground hover:text-foreground"
            )}
          >
            Custom
          </button>
        </div>
        {custom ? (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">+</span>
            <Input
              type="number"
              min={0}
              max={365}
              value={offset}
              disabled={disabled}
              onChange={(e) => setOffset(Number(e.target.value) || 0)}
              className="h-8 w-20 text-sm"
            />
            <span className="text-[11px] text-muted-foreground">day(s) after run</span>
          </div>
        ) : null}
      </div>
      <div className="space-y-1.5">
        <Label className={FIELD_LABEL}>Due time (optional)</Label>
        <Input
          type="time"
          value={current?.dueTime ?? ""}
          disabled={disabled}
          onChange={(e) =>
            setValue(`subtasks.${index}.dueTime` as const, e.target.value || undefined, {
              shouldDirty: true,
            })
          }
          className="h-8 w-[140px] text-sm"
        />
      </div>
      <p className="text-[10px] leading-relaxed text-muted-foreground/85">
        Checklist due dates are calculated from each generated run&apos;s date — not a fixed calendar date.
      </p>
    </div>
  );
}

interface PlannerChecklistProps {
  projectId: string;
  fields: Array<{ id: string } & SubtaskItem>;
  values?: SubtaskItem[];
  register: UseFormRegister<any>;
  setValue: UseFormSetValue<any>;
  append: UseFieldArrayAppend<any, any>;
  remove: UseFieldArrayRemove;
  errors: FieldErrors<any>;
  disabled?: boolean;
}

export function PlannerChecklist({
  projectId,
  fields,
  values,
  register,
  setValue,
  append,
  remove,
  disabled,
}: PlannerChecklistProps) {
  const [draft, setDraft] = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const addItem = () => {
    const title = draft.trim();
    if (!title || disabled) return;
    append({
      id: generateClientId(),
      title,
      completed: false,
      status: "TODO",
      priority: "MEDIUM",
      dueOffsetDays: 0,
    } as SubtaskItem);
    setDraft("");
  };

  const toggleExpanded = (index: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <div className="space-y-2.5">
      {fields.length > 0 ? (
        <ul className="space-y-1.5">
          {fields.map((field, index) => {
            const isOpen = expanded.has(index);
            const current = values?.[index];
            return (
              <li
                key={field.id}
                className="rounded-lg border border-border/55 bg-background"
              >
                <div className="flex items-center gap-2 px-2.5 py-1.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-semibold text-muted-foreground">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Input
                      {...register(`subtasks.${index}.title` as const)}
                      placeholder="Checklist item"
                      disabled={disabled}
                      className="h-8 border-0 bg-transparent px-1 text-sm shadow-none focus-visible:ring-0"
                    />
                    {!isOpen && (current?.title ?? "").trim() ? (
                      <p className="px-1 text-[10px] text-muted-foreground">
                        {formatChecklistDueSummary(current)}
                      </p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                    disabled={disabled}
                    onClick={() => toggleExpanded(index)}
                    aria-label="More options"
                    aria-expanded={isOpen}
                  >
                    <ChevronDown
                      className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")}
                    />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                    disabled={disabled}
                    onClick={() => remove(index)}
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {isOpen ? (
                  <div className="space-y-2.5 border-t border-border/45 px-2.5 py-2.5">
                    <Input
                      {...register(`subtasks.${index}.description` as const)}
                      placeholder="Description (optional)"
                      disabled={disabled}
                      className="h-8 text-sm"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <SubtaskPrioritySelector
                        value={current?.priority ?? "MEDIUM"}
                        onChange={(p) =>
                          setValue(`subtasks.${index}.priority` as const, p, {
                            shouldDirty: true,
                          })
                        }
                        disabled={disabled}
                      />
                      <SubtaskAssigneeSelector
                        projectId={projectId}
                        value={current?.assigneeId}
                        onChange={(assigneeId) =>
                          setValue(`subtasks.${index}.assigneeId` as const, assigneeId, {
                            shouldDirty: true,
                          })
                        }
                        disabled={disabled}
                      />
                    </div>
                    <ChecklistRelativeDueControl
                      index={index}
                      current={current}
                      setValue={setValue}
                      disabled={disabled}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-border/55 bg-muted/15 px-3 py-2.5 text-[11px] text-muted-foreground">
          <ListChecks className="h-3.5 w-3.5 shrink-0" />
          No checklist items yet. Each generated run gets its own copy.
        </div>
      )}

      <div className="flex items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addItem();
            }
          }}
          placeholder="Add a checklist item…"
          disabled={disabled}
          className="h-9 flex-1 text-sm"
        />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-9 shrink-0 gap-1 px-3"
          disabled={disabled || !draft.trim()}
          onClick={addItem}
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>
    </div>
  );
}

export const PLANNER_SECTION_ICONS = {
  schedule: <Repeat className="h-4 w-4" />,
  checklist: <ListChecks className="h-4 w-4" />,
};
