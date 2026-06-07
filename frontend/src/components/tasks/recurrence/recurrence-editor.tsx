"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { TaskRecurrenceConfig } from "@/types/api";
import { recurrenceSummary } from "@/lib/recurrence-display";

const REPEAT_OPTIONS = ["NONE", "DAILY", "WEEKLY", "MONTHLY", "YEARLY", "CUSTOM"] as const;
const END_OPTIONS = ["NEVER", "ON_DATE", "AFTER_OCCURRENCES"] as const;
const WEEK_DAYS = [
  { label: "Sun", value: 0 },
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
];

interface RecurrenceEditorProps {
  value?: TaskRecurrenceConfig;
  onChange: (value?: TaskRecurrenceConfig) => void;
  disabled?: boolean;
  compact?: boolean;
  /** Flat layout for sidebar embedding — no outer card chrome. */
  embedded?: boolean;
  /** Suppress inline summary (parent shows it once). */
  hideSummary?: boolean;
}

function normalize(value?: TaskRecurrenceConfig): TaskRecurrenceConfig {
  return {
    repeat: value?.repeat ?? "NONE",
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
    endAfterOccurrences: value?.endAfterOccurrences ?? 10,
    createDaysBeforeDue: value?.createDaysBeforeDue ?? 0,
    dueLogic: value?.dueLogic ?? "DUE_DATE",
    dueTime: value?.dueTime,
  };
}

export function RecurrenceEditor({
  value,
  onChange,
  disabled,
  compact,
  embedded,
  hideSummary,
}: RecurrenceEditorProps) {
  const state = normalize(value);
  const repeatEnabled = state.repeat && state.repeat !== "NONE";
  const summaryText = recurrenceSummary(state);
  const fieldGrid = embedded ? "grid gap-3 grid-cols-1" : "grid gap-3 sm:grid-cols-2";

  const patch = (next: Partial<TaskRecurrenceConfig>) => {
    const merged = { ...state, ...next };
    if ((merged.repeat ?? "NONE") === "NONE") {
      onChange({ repeat: "NONE" });
      return;
    }
    onChange(merged);
  };

  return (
    <div
      className={cn(
        "space-y-3",
        !embedded && "rounded-xl border border-border/70 bg-muted/20 p-3",
        !embedded && compact && "p-2.5",
        embedded && "space-y-2.5"
      )}
    >
      <div className="space-y-1.5">
        <Label
          className={cn(
            "text-xs text-muted-foreground",
            !embedded && "font-semibold uppercase tracking-wider"
          )}
        >
          Frequency
        </Label>
        <select
          value={state.repeat ?? "NONE"}
          disabled={disabled}
          onChange={(e) => patch({ repeat: e.target.value as TaskRecurrenceConfig["repeat"] })}
          className={cn(
            "h-9 w-full rounded-lg border bg-background px-3 text-sm",
            embedded && "h-10 rounded-xl shadow-[inset_0_0_0_1px_rgba(15,23,42,0.08)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]"
          )}
        >
          {REPEAT_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt === "NONE" ? "Does not repeat" : opt[0] + opt.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </div>

      {repeatEnabled ? (
        <>
          {!hideSummary && summaryText ? (
            <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-medium text-primary">
              {summaryText}
            </div>
          ) : null}
          <div className={fieldGrid}>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Every</Label>
              <Input
                type="number"
                min={1}
                max={365}
                value={state.interval ?? 1}
                disabled={disabled}
                onChange={(e) => patch({ interval: Math.max(1, Number(e.target.value) || 1) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Create days before due</Label>
              <Input
                type="number"
                min={0}
                max={365}
                value={state.createDaysBeforeDue ?? 0}
                disabled={disabled}
                onChange={(e) =>
                  patch({ createDaysBeforeDue: Math.max(0, Number(e.target.value) || 0) })
                }
              />
            </div>
          </div>

          {state.repeat === "WEEKLY" ? (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Days of week</Label>
              <div className="flex flex-wrap gap-1.5">
                {WEEK_DAYS.map((d) => {
                  const active = (state.weeklyDays ?? []).includes(d.value);
                  return (
                    <button
                      key={d.value}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        const current = new Set(state.weeklyDays ?? []);
                        if (current.has(d.value)) current.delete(d.value);
                        else current.add(d.value);
                        patch({ weeklyDays: Array.from(current).sort((a, b) => a - b) });
                      }}
                      className={cn(
                        "rounded-md border px-2 py-1 text-xs",
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground"
                      )}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {state.repeat === "MONTHLY" ? (
            <div className={fieldGrid}>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Monthly rule</Label>
                <select
                  value={state.monthlyMode ?? "DAY_OF_MONTH"}
                  disabled={disabled}
                  onChange={(e) =>
                    patch({
                      monthlyMode: e.target.value as TaskRecurrenceConfig["monthlyMode"],
                    })
                  }
                  className="h-9 w-full rounded-lg border bg-background px-3 text-sm"
                >
                  <option value="DAY_OF_MONTH">Fixed day of month</option>
                  <option value="LAST_DAY">Last day of month</option>
                  <option value="NTH_WEEKDAY">First/Second/etc weekday</option>
                </select>
              </div>
              {state.monthlyMode === "DAY_OF_MONTH" ? (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Day of month</Label>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    value={state.dayOfMonth ?? 1}
                    disabled={disabled}
                    onChange={(e) => patch({ dayOfMonth: Number(e.target.value) || 1 })}
                  />
                </div>
              ) : null}
              {state.monthlyMode === "NTH_WEEKDAY" ? (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Week</Label>
                    <select
                      value={state.nthWeek ?? 1}
                      disabled={disabled}
                      onChange={(e) => patch({ nthWeek: Number(e.target.value) })}
                      className="h-9 w-full rounded-lg border bg-background px-3 text-sm"
                    >
                      <option value={1}>First</option>
                      <option value={2}>Second</option>
                      <option value={3}>Third</option>
                      <option value={4}>Fourth</option>
                      <option value={-1}>Last</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Weekday</Label>
                    <select
                      value={state.weekday ?? 1}
                      disabled={disabled}
                      onChange={(e) => patch({ weekday: Number(e.target.value) })}
                      className="h-9 w-full rounded-lg border bg-background px-3 text-sm"
                    >
                      {WEEK_DAYS.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}

          {state.repeat === "YEARLY" ? (
            <div className={fieldGrid}>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Month</Label>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={state.monthOfYear ?? 1}
                  disabled={disabled}
                  onChange={(e) => patch({ monthOfYear: Number(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Day</Label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={state.dayOfYearMonth ?? 1}
                  disabled={disabled}
                  onChange={(e) => patch({ dayOfYearMonth: Number(e.target.value) || 1 })}
                />
              </div>
            </div>
          ) : null}

          {state.repeat === "CUSTOM" ? (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Custom unit</Label>
              <select
                value={state.customUnit ?? "DAY"}
                disabled={disabled}
                onChange={(e) => patch({ customUnit: e.target.value as TaskRecurrenceConfig["customUnit"] })}
                className="h-9 w-full rounded-lg border bg-background px-3 text-sm"
              >
                <option value="DAY">Day</option>
                <option value="WEEK">Week</option>
                <option value="MONTH">Month</option>
                <option value="YEAR">Year</option>
              </select>
            </div>
          ) : null}

          <div className={fieldGrid}>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Ends</Label>
              <select
                value={state.endType ?? "NEVER"}
                disabled={disabled}
                onChange={(e) => patch({ endType: e.target.value as TaskRecurrenceConfig["endType"] })}
                className="h-9 w-full rounded-lg border bg-background px-3 text-sm"
              >
                {END_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt === "ON_DATE"
                      ? "On date"
                      : opt === "AFTER_OCCURRENCES"
                        ? "After occurrences"
                        : "Never"}
                  </option>
                ))}
              </select>
            </div>
            {state.endType === "ON_DATE" ? (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">End date</Label>
                <Input
                  type="date"
                  value={state.endDate ?? ""}
                  disabled={disabled}
                  onChange={(e) => patch({ endDate: e.target.value || undefined })}
                />
              </div>
            ) : null}
            {state.endType === "AFTER_OCCURRENCES" ? (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Occurrences</Label>
                <Input
                  type="number"
                  min={1}
                  max={10000}
                  value={state.endAfterOccurrences ?? 10}
                  disabled={disabled}
                  onChange={(e) =>
                    patch({ endAfterOccurrences: Math.max(1, Number(e.target.value) || 1) })
                  }
                />
              </div>
            ) : null}
          </div>

          <div className={fieldGrid}>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Due logic</Label>
              <select
                value={state.dueLogic ?? "DUE_DATE"}
                disabled={disabled}
                onChange={(e) =>
                  patch({ dueLogic: e.target.value as TaskRecurrenceConfig["dueLogic"] })
                }
                className="h-9 w-full rounded-lg border bg-background px-3 text-sm"
              >
                <option value="DUE_DATE">Due date only</option>
                <option value="DUE_TIME">Use due time</option>
              </select>
            </div>
            {state.dueLogic === "DUE_TIME" ? (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Due time</Label>
                <Input
                  type="time"
                  value={state.dueTime ?? ""}
                  disabled={disabled}
                  onChange={(e) => patch({ dueTime: e.target.value || undefined })}
                />
              </div>
            ) : null}
          </div>
          <p className="text-[11px] text-muted-foreground/80">
            Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
          </p>
        </>
      ) : null}
    </div>
  );
}

