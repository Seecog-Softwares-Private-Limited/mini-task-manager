"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchRecurringTemplateHistory } from "@/services/api/recurring-tasks.api";
import { formatShortDate } from "@/lib/recurring-board-utils";
import {
  getRecurringOccurrenceStatus,
  OCCURRENCE_STATUS_STYLES,
} from "@/lib/recurring-board-filters";
import { toRecurrenceLabel } from "@/lib/recurrence-display";
import { getRecurringCardTheme } from "@/lib/recurring-card-theme";
import { EXEC_PLANNER } from "@/lib/executive-planner-theme";
import type {
  RecurringTemplateSummary,
  Task,
  TaskRecurrenceConfig,
  WorkflowStatus,
} from "@/types/api";
import {
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  History,
  Layers,
  Pause,
  Pencil,
  Play,
  Repeat,
  Save,
  Trash2,
  X,
} from "lucide-react";

type RepeatType = RecurringTemplateSummary["repeatType"];
type EndType = RecurringTemplateSummary["endType"];

const REPEAT_OPTIONS: { value: RepeatType; label: string }[] = [
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "YEARLY", label: "Yearly" },
  { value: "CUSTOM", label: "Custom" },
];

const END_OPTIONS: { value: EndType; label: string }[] = [
  { value: "NEVER", label: "Never ends" },
  { value: "ON_DATE", label: "Ends on date" },
  { value: "AFTER_OCCURRENCES", label: "After N runs" },
];

export interface RecurringSeriesDrawerProps {
  template: RecurringTemplateSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  occurrences?: Task[];
  statuses?: WorkflowStatus[];
  overdueTaskIds?: string[];
  readOnly?: boolean;
  isMutating?: boolean;
  startInEdit?: boolean;
  onPause?: (templateId: string) => void;
  onResume?: (templateId: string) => void;
  onDelete?: (template: RecurringTemplateSummary) => void;
  onSaveCadence?: (
    templateId: string,
    payload: { title?: string; recurrence?: TaskRecurrenceConfig }
  ) => void;
  onOpenOccurrence?: (task: Task) => void;
}

const SELECT_CLASS =
  "h-9 w-full rounded-lg border border-border/60 bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

export function RecurringSeriesDrawer({
  template,
  open,
  onOpenChange,
  occurrences = [],
  statuses = [],
  overdueTaskIds = [],
  readOnly,
  isMutating,
  startInEdit,
  onPause,
  onResume,
  onDelete,
  onSaveCadence,
  onOpenOccurrence,
}: RecurringSeriesDrawerProps) {
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftRepeat, setDraftRepeat] = useState<RepeatType>("DAILY");
  const [draftInterval, setDraftInterval] = useState(1);
  const [draftEndType, setDraftEndType] = useState<EndType>("NEVER");
  const [draftEndDate, setDraftEndDate] = useState("");
  const [draftEndAfter, setDraftEndAfter] = useState(10);

  useEffect(() => {
    setEditing(false);
    if (template) {
      setDraftTitle(template.title);
      setDraftRepeat(template.repeatType);
      setDraftInterval(1);
      setDraftEndType(template.endType);
      setDraftEndDate("");
      setDraftEndAfter(10);
    }
  }, [template?.id]);

  useEffect(() => {
    if (open && !readOnly) setEditing(Boolean(startInEdit));
  }, [open, startInEdit, readOnly]);

  const theme = getRecurringCardTheme(template?.repeatType);

  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ["recurring-template-history", template?.id ?? ""],
    queryFn: () => fetchRecurringTemplateHistory(template!.id),
    enabled: open && Boolean(template?.id),
  });

  const upcomingRuns = useMemo(() => {
    return [...occurrences].sort((a, b) =>
      String(a.dueDate ?? "").localeCompare(String(b.dueDate ?? ""))
    );
  }, [occurrences]);

  const pastRuns = useMemo(
    () => history.filter((h) => h.state !== "PENDING").slice(0, 12),
    [history]
  );

  if (!template) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="exec-planner-drawer flex w-full flex-col p-6 sm:max-w-[460px]"
        >
          <SheetHeader>
            <SheetTitle>Series</SheetTitle>
            <SheetDescription>No series selected.</SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    );
  }

  const recurrenceRule = `${toRecurrenceLabel(template.repeatType)} · ${
    template.endType === "NEVER"
      ? "Never ends"
      : template.endType.replace("_", " ").toLowerCase()
  }`;

  function handleSave() {
    if (!template) return;
    const recurrence: TaskRecurrenceConfig = {
      repeat: draftRepeat,
      interval: Math.max(1, Number(draftInterval) || 1),
      endType: draftEndType,
      ...(draftEndType === "ON_DATE" && draftEndDate ? { endDate: draftEndDate } : {}),
      ...(draftEndType === "AFTER_OCCURRENCES"
        ? { endAfterOccurrences: Math.max(1, Number(draftEndAfter) || 1) }
        : {}),
    };
    onSaveCadence?.(template.id, {
      title: draftTitle.trim() || undefined,
      recurrence,
    });
    setEditing(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="exec-planner-drawer flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-[460px]"
      >
        <div className={cn("shrink-0 border-b px-6 pb-4 pt-6", theme.surface)}>
          <span className={cn("mb-3 inline-block h-1 w-14 rounded-full", theme.rail)} />
          <SheetHeader className="space-y-2 text-left">
            <SheetTitle className="flex items-center gap-2 text-xl font-semibold leading-snug tracking-tight">
              <Layers className="h-5 w-5 shrink-0 text-muted-foreground" />
              {template.title}
            </SheetTitle>
            <SheetDescription className="text-xs leading-relaxed">
              Recurring series · manage the schedule and its runs
            </SheetDescription>
          </SheetHeader>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge variant="outline" className={cn("gap-1 text-[10px]", theme.ribbon)}>
              <Repeat className="h-3 w-3" />
              {toRecurrenceLabel(template.repeatType)}
            </Badge>
            {template.isPaused ? (
              <Badge
                variant="outline"
                className="border-amber-400/30 bg-amber-500/10 text-[10px] text-amber-800"
              >
                Paused
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-emerald-400/30 bg-emerald-500/10 text-[10px] text-emerald-700"
              >
                Active
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px] tabular-nums">
              {template.upcoming} upcoming
            </Badge>
            <Badge variant="outline" className="text-[10px] tabular-nums">
              {template.completed} completed
            </Badge>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {/* Schedule / edit cadence */}
          <section className={cn(EXEC_PLANNER.paperCard, "p-3")}>
            <div className="flex items-center justify-between">
              <h3 className={EXEC_PLANNER.sectionLabel}>Schedule</h3>
              {!readOnly && !editing ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1 px-2 text-xs"
                  onClick={() => setEditing(true)}
                >
                  <Pencil className="h-3 w-3" />
                  Edit cadence
                </Button>
              ) : null}
            </div>

            {editing ? (
              <div className="mt-2 space-y-2.5">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                    Series title
                  </label>
                  <Input
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    className="h-9 text-sm"
                    placeholder="Series title"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                      Frequency
                    </label>
                    <select
                      className={SELECT_CLASS}
                      value={draftRepeat}
                      onChange={(e) => setDraftRepeat(e.target.value as RepeatType)}
                    >
                      {REPEAT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                      Repeat every
                    </label>
                    <Input
                      type="number"
                      min={1}
                      value={draftInterval}
                      onChange={(e) => setDraftInterval(Number(e.target.value))}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                    Ends
                  </label>
                  <select
                    className={SELECT_CLASS}
                    value={draftEndType}
                    onChange={(e) => setDraftEndType(e.target.value as EndType)}
                  >
                    {END_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                {draftEndType === "ON_DATE" ? (
                  <Input
                    type="date"
                    value={draftEndDate}
                    onChange={(e) => setDraftEndDate(e.target.value)}
                    className="h-9 text-sm"
                  />
                ) : null}
                {draftEndType === "AFTER_OCCURRENCES" ? (
                  <Input
                    type="number"
                    min={1}
                    value={draftEndAfter}
                    onChange={(e) => setDraftEndAfter(Number(e.target.value))}
                    className="h-9 text-sm"
                    placeholder="Number of runs"
                  />
                ) : null}
                <p className="text-[10px] leading-relaxed text-muted-foreground">
                  Changing the frequency reschedules future runs. Advanced patterns
                  (specific weekdays / monthly rules) are kept from the original
                  series unless you change the frequency here.
                </p>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8"
                    onClick={() => setEditing(false)}
                    disabled={isMutating}
                  >
                    <X className="mr-1 h-3.5 w-3.5" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 gap-1"
                    onClick={handleSave}
                    disabled={isMutating || !draftTitle.trim()}
                  >
                    <Save className="h-3.5 w-3.5" />
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="mt-1 text-sm font-medium">{recurrenceRule}</p>
                <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <CalendarClock className="h-3.5 w-3.5" />
                  Next run {formatShortDate(String(template.nextDueDate).slice(0, 10))}
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Generated {template.generatedCount} ·{" "}
                  {template.createDaysBeforeDue > 0
                    ? `Created ${template.createDaysBeforeDue} day(s) before due`
                    : "Created on due date"}
                </p>
              </>
            )}
          </section>

          {/* Upcoming runs */}
          <section>
            <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5" />
              Upcoming runs
            </h3>
            {upcomingRuns.length > 0 ? (
              <ul className="space-y-1.5">
                {upcomingRuns.map((task) => {
                  const occStatus = getRecurringOccurrenceStatus(
                    task,
                    overdueTaskIds,
                    statuses
                  );
                  const style = OCCURRENCE_STATUS_STYLES[occStatus];
                  return (
                    <li key={task.id}>
                      <button
                        type="button"
                        onClick={() => onOpenOccurrence?.(task)}
                        className="flex w-full items-center justify-between gap-2 rounded-xl border border-border/35 bg-background/70 px-3 py-2 text-left text-xs transition-colors hover:border-border hover:bg-muted/30"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          {task.recurrenceSequence ? (
                            <span className="shrink-0 font-semibold tabular-nums">
                              #{task.recurrenceSequence}
                            </span>
                          ) : null}
                          <span className="truncate text-muted-foreground">
                            {task.dueDate ? formatShortDate(task.dueDate) : "No date"}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-1.5">
                          {style ? (
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px]",
                                style.bg,
                                style.text,
                                style.border
                              )}
                            >
                              {style.label}
                            </Badge>
                          ) : null}
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="rounded-xl border border-dashed border-border/50 px-3 py-4 text-center text-xs text-muted-foreground">
                No open runs scheduled.
              </p>
            )}
          </section>

          {/* Run history */}
          <section>
            <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <History className="h-3.5 w-3.5" />
              Run history
            </h3>
            {historyLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            ) : pastRuns.length > 0 ? (
              <ul className="space-y-1.5">
                {pastRuns.map((occ) => (
                  <li
                    key={occ.id}
                    className="flex items-center justify-between rounded-xl border border-border/35 bg-background/60 px-3 py-2 text-xs"
                  >
                    <span>
                      Run #{occ.sequenceNumber}
                      <span className="ml-2 text-muted-foreground">
                        {formatShortDate(occ.dueDate)}
                      </span>
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        occ.state === "COMPLETED" && "border-emerald-400/30 text-emerald-700",
                        occ.state === "SKIPPED" && "border-amber-400/30 text-amber-700"
                      )}
                    >
                      {occ.state.toLowerCase()}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No completed runs yet.</p>
            )}
          </section>
        </div>

        {/* Footer actions */}
        {!readOnly ? (
          <div className="shrink-0 space-y-2 border-t border-border/45 bg-muted/10 p-4">
            <div className="grid grid-cols-2 gap-2">
              {template.isPaused ? (
                <Button
                  size="sm"
                  className="gap-1.5"
                  disabled={isMutating}
                  onClick={() => onResume?.(template.id)}
                >
                  <Play className="h-3.5 w-3.5" />
                  Resume series
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  disabled={isMutating}
                  onClick={() => onPause?.(template.id)}
                >
                  <Pause className="h-3.5 w-3.5" />
                  Pause series
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                disabled={isMutating}
                onClick={() => onDelete?.(template)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete series
              </Button>
            </div>
            {template.isPaused ? (
              <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <CheckCircle2 className="h-3 w-3" />
                Resuming generates upcoming runs again.
              </p>
            ) : null}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
