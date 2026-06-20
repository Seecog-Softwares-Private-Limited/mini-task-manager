"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AssigneeMap } from "@/components/kanban/kanban-board";
import type { RecurringSeriesStatus, RecurringTemplateSummary } from "@/types/api";
import { toRecurrenceLabel } from "@/lib/recurrence-display";
import { formatShortDate } from "@/lib/recurring-board-utils";
import { cadenceAccentClass } from "@/lib/recurring-board-constants";
import { EXEC_PLANNER } from "@/lib/executive-planner-theme";
import {
  Archive,
  CalendarClock,
  CheckCircle2,
  Copy,
  History,
  ListChecks,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Plus,
  Repeat,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

type StatusFilter = "ALL" | RecurringSeriesStatus;
type FrequencyFilter = "ALL" | RecurringTemplateSummary["repeatType"];

interface RecurringSeriesLibraryProps {
  templates: RecurringTemplateSummary[];
  assigneeMap?: AssigneeMap;
  canManage?: boolean;
  isMutating?: boolean;
  onOpen: (template: RecurringTemplateSummary) => void;
  onEdit: (template: RecurringTemplateSummary) => void;
  onPause: (templateId: string) => void;
  onResume: (templateId: string) => void;
  onArchive: (template: RecurringTemplateSummary) => void;
  onDuplicate?: (template: RecurringTemplateSummary) => void;
  onDelete?: (template: RecurringTemplateSummary) => void;
  onViewHistory: (template: RecurringTemplateSummary) => void;
  onCreate?: () => void;
  className?: string;
}

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "PAUSED", label: "Paused" },
  { value: "ARCHIVED", label: "Archived" },
];

const FREQUENCY_OPTIONS: { value: FrequencyFilter; label: string }[] = [
  { value: "ALL", label: "All frequencies" },
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "YEARLY", label: "Yearly" },
  { value: "CUSTOM", label: "Custom" },
];

const SELECT_CLASS =
  "h-8 rounded-lg border border-border/55 bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30";

function seriesStatusOf(t: RecurringTemplateSummary): RecurringSeriesStatus {
  if (t.status) return t.status;
  return t.isPaused ? "PAUSED" : "ACTIVE";
}

const STATUS_BADGE: Record<RecurringSeriesStatus, string> = {
  ACTIVE: "border-emerald-400/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  PAUSED: "border-amber-400/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  ARCHIVED: "border-slate-400/30 bg-slate-500/10 text-slate-600 dark:text-slate-300",
};

function healthAccent(pct: number): string {
  if (pct >= 70) return "text-emerald-700 dark:text-emerald-300";
  if (pct >= 40) return "text-amber-700 dark:text-amber-300";
  return "text-rose-700 dark:text-rose-300";
}

export function RecurringSeriesLibrary({
  templates,
  assigneeMap,
  canManage,
  isMutating,
  onOpen,
  onEdit,
  onPause,
  onResume,
  onArchive,
  onDuplicate,
  onDelete,
  onViewHistory,
  onCreate,
  className,
}: RecurringSeriesLibraryProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [frequencyFilter, setFrequencyFilter] = useState<FrequencyFilter>("ALL");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("ALL");

  const assigneeOptions = useMemo(() => {
    const ids = new Set<string>();
    for (const t of templates) {
      if (t.assigneeId) ids.add(t.assigneeId);
      for (const id of t.assigneeIds ?? []) ids.add(id);
    }
    return Array.from(ids).map((id) => ({
      id,
      name: assigneeMap?.[id]?.name ?? "User",
    }));
  }, [templates, assigneeMap]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates.filter((t) => {
      if (q && !t.title.toLowerCase().includes(q)) return false;
      if (statusFilter !== "ALL" && seriesStatusOf(t) !== statusFilter) return false;
      if (frequencyFilter !== "ALL" && t.repeatType !== frequencyFilter) return false;
      if (assigneeFilter !== "ALL") {
        const ids = new Set<string>([
          ...(t.assigneeId ? [t.assigneeId] : []),
          ...(t.assigneeIds ?? []),
        ]);
        if (!ids.has(assigneeFilter)) return false;
      }
      return true;
    });
  }, [templates, search, statusFilter, frequencyFilter, assigneeFilter]);

  const hasFilters =
    search.trim().length > 0 ||
    statusFilter !== "ALL" ||
    frequencyFilter !== "ALL" ||
    assigneeFilter !== "ALL";

  // Premium empty state — no series exist at all.
  if (templates.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-1 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/50 bg-muted/5 px-6 py-16 text-center",
          className
        )}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Sparkles className="h-7 w-7 text-primary" />
        </div>
        <p className="mt-4 text-lg font-semibold">No recurring planners created yet</p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Create your first recurring planner to automate daily, weekly, or monthly
          work routines for this project.
        </p>
        {canManage && onCreate ? (
          <Button className="mt-5 gap-1.5 shadow-sm" onClick={onCreate}>
            <Plus className="h-4 w-4" />
            Create recurring planner
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col gap-2", className)}>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-1.5">
        <div className="relative w-full min-w-[10rem] sm:w-56">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search series..."
            className="h-8 rounded-lg border-border/50 bg-background/80 pl-8 pr-8 text-sm"
            aria-label="Search recurring series"
          />
          {search ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
        <select
          className={SELECT_CLASS}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          aria-label="Filter by status"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          className={SELECT_CLASS}
          value={frequencyFilter}
          onChange={(e) => setFrequencyFilter(e.target.value as FrequencyFilter)}
          aria-label="Filter by frequency"
        >
          {FREQUENCY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {assigneeOptions.length > 0 ? (
          <select
            className={SELECT_CLASS}
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            aria-label="Filter by assignee"
          >
            <option value="ALL">All assignees</option>
            {assigneeOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        ) : null}
        <div className="flex-1" />
        <span className="text-xs tabular-nums text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "series" : "series"}
        </span>
      </div>

      {/* List */}
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pb-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-border/50 px-4 py-10 text-center">
            <p className="text-sm font-medium">No series match these filters</p>
            {hasFilters ? (
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("ALL");
                  setFrequencyFilter("ALL");
                  setAssigneeFilter("ALL");
                }}
              >
                Clear filters
              </Button>
            ) : null}
          </div>
        ) : (
          filtered.map((t) => (
            <SeriesRow
              key={t.id}
              template={t}
              assigneeMap={assigneeMap}
              canManage={canManage}
              isMutating={isMutating}
              onOpen={onOpen}
              onEdit={onEdit}
              onPause={onPause}
              onResume={onResume}
              onArchive={onArchive}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
              onViewHistory={onViewHistory}
            />
          ))
        )}
      </div>
    </div>
  );
}

function SeriesRow({
  template,
  assigneeMap,
  canManage,
  isMutating,
  onOpen,
  onEdit,
  onPause,
  onResume,
  onArchive,
  onDuplicate,
  onDelete,
  onViewHistory,
}: {
  template: RecurringTemplateSummary;
  assigneeMap?: AssigneeMap;
  canManage?: boolean;
  isMutating?: boolean;
  onOpen: (t: RecurringTemplateSummary) => void;
  onEdit: (t: RecurringTemplateSummary) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onArchive: (t: RecurringTemplateSummary) => void;
  onDuplicate?: (t: RecurringTemplateSummary) => void;
  onDelete?: (t: RecurringTemplateSummary) => void;
  onViewHistory: (t: RecurringTemplateSummary) => void;
}) {
  const status = seriesStatusOf(template);
  const health = template.completionHealth ?? 0;
  const assigneeIds = template.assigneeIds?.length
    ? template.assigneeIds
    : template.assigneeId
      ? [template.assigneeId]
      : [];

  return (
    <div
      className={cn(
        EXEC_PLANNER.paperCard,
        EXEC_PLANNER.paperCardHover,
        "group relative border-l-[3px] p-3 transition-shadow",
        cadenceAccentClass(template.repeatType)
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => onOpen(template)}
          className="flex min-w-0 flex-1 items-start gap-2 text-left"
        >
          <Repeat className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="truncate text-sm font-semibold leading-snug">
                {template.title}
              </span>
              <Badge variant="outline" className="text-[10px]">
                {toRecurrenceLabel(template.repeatType)}
              </Badge>
              <Badge variant="outline" className={cn("text-[10px]", STATUS_BADGE[status])}>
                {status.charAt(0) + status.slice(1).toLowerCase()}
              </Badge>
            </div>
            {template.description ? (
              <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                {template.description}
              </p>
            ) : null}
          </div>
        </button>

        <div className="flex shrink-0 items-center gap-2">
          {assigneeIds.length > 0 ? (
            <div className="flex -space-x-1.5">
              {assigneeIds.slice(0, 3).map((id) => (
                <UserAvatar
                  key={id}
                  userId={id}
                  name={assigneeMap?.[id]?.name ?? "User"}
                  avatarUrl={assigneeMap?.[id]?.avatarUrl}
                  className="h-6 w-6 ring-2 ring-card"
                />
              ))}
              {assigneeIds.length > 3 ? (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[9px] font-semibold ring-2 ring-card">
                  +{assigneeIds.length - 3}
                </span>
              ) : null}
            </div>
          ) : null}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground"
                aria-label="Series actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => onOpen(template)}>
                <CalendarClock className="mr-2 h-3.5 w-3.5" /> Open
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewHistory(template)}>
                <History className="mr-2 h-3.5 w-3.5" /> View history
              </DropdownMenuItem>
              {canManage ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled={isMutating} onClick={() => onEdit(template)}>
                    <Pencil className="mr-2 h-3.5 w-3.5" /> Edit planner
                  </DropdownMenuItem>
                  {status === "ACTIVE" ? (
                    <DropdownMenuItem
                      disabled={isMutating}
                      onClick={() => onPause(template.id)}
                    >
                      <Pause className="mr-2 h-3.5 w-3.5" /> Pause planner
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      disabled={isMutating}
                      onClick={() => onResume(template.id)}
                    >
                      <Play className="mr-2 h-3.5 w-3.5" /> Resume planner
                    </DropdownMenuItem>
                  )}
                  {onDuplicate ? (
                    <DropdownMenuItem
                      disabled={isMutating}
                      onClick={() => onDuplicate(template)}
                    >
                      <Copy className="mr-2 h-3.5 w-3.5" /> Duplicate planner
                    </DropdownMenuItem>
                  ) : null}
                  {status !== "ARCHIVED" ? (
                    <DropdownMenuItem
                      disabled={isMutating}
                      onClick={() => onArchive(template)}
                    >
                      <Archive className="mr-2 h-3.5 w-3.5" /> Archive planner
                    </DropdownMenuItem>
                  ) : null}
                  {onDelete ? (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        disabled={isMutating}
                        className="text-destructive focus:text-destructive"
                        onClick={() => onDelete(template)}
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete planner
                      </DropdownMenuItem>
                    </>
                  ) : null}
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Metrics row */}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <CalendarClock className="h-3 w-3" />
          Next {formatShortDate(String(template.nextDueDate).slice(0, 10)) || "—"}
        </span>
        <span className={cn("font-medium", healthAccent(health))}>{health}% health</span>
        {(template.missed ?? 0) > 0 ? (
          <span className="font-medium text-rose-600 dark:text-rose-400">
            {template.missed} missed
          </span>
        ) : null}
        <span>
          {template.generatedCount} {template.generatedCount === 1 ? "run" : "runs"}
        </span>
        {(template.subtaskCount ?? 0) > 0 ? (
          <span className="inline-flex items-center gap-1">
            <ListChecks className="h-3 w-3" />
            {template.subtaskCount} checklist
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1">
          {template.lastRunState === "COMPLETED" ? (
            <>
              <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Last run done
            </>
          ) : template.lastRunState === "SKIPPED" ? (
            <>Last run skipped</>
          ) : template.generatedCount > 0 ? (
            <>Awaiting completion</>
          ) : (
            <>No runs yet</>
          )}
        </span>
      </div>
    </div>
  );
}
