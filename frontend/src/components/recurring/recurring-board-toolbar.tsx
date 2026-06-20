"use client";

import { useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { AssigneeMap } from "@/components/kanban/kanban-board";
import type {
  RecurrenceTypeFilter,
  RecurringBoardFilters,
} from "@/lib/recurring-board-filters";
import { EXEC_PLANNER } from "@/lib/executive-planner-theme";
import type { WorkflowStatus } from "@/types/api";
import {
  Search,
  User,
  X,
  SlidersHorizontal,
  LayoutGrid,
  List,
  CalendarDays,
  BookOpen,
  ListTodo,
  Repeat,
  AlertTriangle,
  Clock,
  UserCheck,
  PauseCircle,
  ChevronDown,
} from "lucide-react";

export type RecurringViewMode = "agenda" | "calendar" | "shelf" | "board" | "table";

const PRIMARY_VIEW: RecurringViewMode = "calendar";

const MORE_VIEWS: {
  mode: RecurringViewMode;
  label: string;
  icon: typeof ListTodo;
}[] = [
  { mode: "agenda", label: "Agenda list", icon: ListTodo },
  { mode: "board", label: "Board", icon: LayoutGrid },
  { mode: "table", label: "Table", icon: List },
  { mode: "shelf", label: "Manage series", icon: BookOpen },
];

const RECURRENCE_TYPES: { value: RecurrenceTypeFilter; label: string }[] = [
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "YEARLY", label: "Yearly" },
  { value: "CUSTOM", label: "Custom" },
];

const FILTER_BTN = cn(
  "h-[28px] gap-1.5 rounded-lg border-border/60 text-xs font-medium transition-all duration-200",
  "hover:border-border hover:bg-muted/30"
);

interface RecurringBoardToolbarProps {
  filters: RecurringBoardFilters;
  onFiltersChange: (filters: RecurringBoardFilters) => void;
  assigneeMap?: AssigneeMap;
  statuses?: WorkflowStatus[];
  viewMode: RecurringViewMode;
  onViewModeChange: (mode: RecurringViewMode) => void;
  taskCount?: number;
  filteredCount?: number;
}

export function RecurringBoardToolbar({
  filters,
  onFiltersChange,
  assigneeMap,
  statuses = [],
  viewMode,
  onViewModeChange,
  taskCount = 0,
  filteredCount,
}: RecurringBoardToolbarProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isCalendarPrimary = viewMode === PRIMARY_VIEW;

  const hasAdvancedFilters =
    filters.recurrenceTypes.length > 0 ||
    filters.priority.length > 0 ||
    filters.missedOnly ||
    filters.dueTodayOnly ||
    filters.overdueOnly ||
    filters.assignedToMe ||
    filters.pausedSeriesOnly;

  const hasActiveFilters =
    filters.search.length > 0 ||
    filters.statusIds.length > 0 ||
    filters.assignee.length > 0 ||
    hasAdvancedFilters;

  const activeMoreView = MORE_VIEWS.find((v) => v.mode === viewMode);

  const updateFilter = useCallback(
    <K extends keyof RecurringBoardFilters>(key: K, value: RecurringBoardFilters[K]) => {
      onFiltersChange({ ...filters, [key]: value });
    },
    [filters, onFiltersChange]
  );

  const toggleArrayFilter = useCallback(
    (key: "priority" | "assignee" | "recurrenceTypes" | "statusIds", value: string) => {
      const current = filters[key] as string[];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      updateFilter(key, next as RecurringBoardFilters[typeof key]);
    },
    [filters, updateFilter]
  );

  function clearFilters() {
    onFiltersChange({
      ...filters,
      search: "",
      statusIds: [],
      assignee: [],
      priority: [],
      recurrenceTypes: [],
      missedOnly: false,
      dueTodayOnly: false,
      overdueOnly: false,
      assignedToMe: false,
      pausedSeriesOnly: false,
    });
  }

  const assigneeEntries = Object.entries(assigneeMap ?? {});

  return (
    <div className={cn(EXEC_PLANNER.paperCard, "min-w-0 shrink-0 overflow-hidden")}>
      <div className="flex border-b border-border/40 px-2 pt-1.5">
        <button
          type="button"
          onClick={() => onViewModeChange(PRIMARY_VIEW)}
          className={cn(
            EXEC_PLANNER.bookmarkTab,
            "flex items-center gap-1.5",
            isCalendarPrimary && EXEC_PLANNER.bookmarkTabActive
          )}
          aria-current={isCalendarPrimary ? "page" : undefined}
        >
          <CalendarDays className="h-3.5 w-3.5" />
          Calendar
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                EXEC_PLANNER.bookmarkTab,
                "flex items-center gap-1.5",
                !isCalendarPrimary && EXEC_PLANNER.bookmarkTabActive
              )}
              aria-current={!isCalendarPrimary ? "page" : undefined}
            >
              {activeMoreView ? (
                <>
                  <activeMoreView.icon className="h-3.5 w-3.5" />
                  {activeMoreView.label}
                </>
              ) : (
                <>More views</>
              )}
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            <DropdownMenuLabel className="text-xs">Other views</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {MORE_VIEWS.map(({ mode, label, icon: Icon }) => (
              <DropdownMenuItem
                key={mode}
                onClick={() => onViewModeChange(mode)}
                className={cn(viewMode === mode && "bg-muted/50")}
              >
                <Icon className="mr-2 h-3.5 w-3.5" />
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-1.5 p-2.5">
        <div className="relative w-full min-w-[10rem] shrink-0 sm:w-48 md:w-56">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
          <Input
            ref={searchInputRef}
            placeholder="Search entries..."
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="h-8 rounded-lg border-border/50 bg-background/80 pl-8 pr-8 text-sm"
            aria-label="Search recurring tasks"
          />
          {filters.search ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => updateFilter("search", "")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        {statuses.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  FILTER_BTN,
                  filters.statusIds.length > 0 &&
                    "border-sky-400/40 bg-sky-50/50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300"
                )}
              >
                Status
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 max-h-64 overflow-y-auto">
              <DropdownMenuLabel className="text-xs">Workflow status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {statuses.map((s) => (
                <DropdownMenuCheckboxItem
                  key={s.id}
                  checked={filters.statusIds.includes(s.id)}
                  onCheckedChange={() => toggleArrayFilter("statusIds", s.id)}
                >
                  {s.name}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}

        {assigneeEntries.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  FILTER_BTN,
                  filters.assignee.length > 0 &&
                    "border-violet-400/40 bg-violet-50/50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300"
                )}
              >
                <User className="h-3.5 w-3.5" />
                Assignee
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72 max-h-72 overflow-y-auto">
              {assigneeEntries.map(([userId, info]) => (
                <DropdownMenuCheckboxItem
                  key={userId}
                  checked={filters.assignee.includes(userId)}
                  onCheckedChange={() => toggleArrayFilter("assignee", userId)}
                >
                  <div className="flex items-center gap-2">
                    <UserAvatar userId={userId} name={info.name} avatarUrl={info.avatarUrl} className="h-5 w-5" />
                    <span className="truncate">{info.name}</span>
                  </div>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(FILTER_BTN, hasAdvancedFilters && "border-primary/30 bg-primary/5")}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              More filters
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72 p-2">
            <DropdownMenuLabel className="text-xs">Advanced filters</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <p className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Cadence
            </p>
            {RECURRENCE_TYPES.map((t) => (
              <DropdownMenuCheckboxItem
                key={t.value}
                checked={filters.recurrenceTypes.includes(t.value)}
                onCheckedChange={() => toggleArrayFilter("recurrenceTypes", t.value)}
              >
                {t.label}
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            {(
              [
                { key: "missedOnly" as const, label: "Missed only", icon: AlertTriangle },
                { key: "dueTodayOnly" as const, label: "Due today", icon: Clock },
                { key: "overdueOnly" as const, label: "Overdue", icon: AlertTriangle },
                { key: "assignedToMe" as const, label: "Assigned to me", icon: UserCheck },
                { key: "pausedSeriesOnly" as const, label: "Paused series", icon: PauseCircle },
              ] as const
            ).map(({ key, label }) => (
              <DropdownMenuCheckboxItem
                key={key}
                checked={filters[key]}
                onCheckedChange={() => updateFilter(key, !filters[key])}
              >
                {label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex-1" />

        {filteredCount !== undefined && filteredCount !== taskCount ? (
          <span className="text-xs tabular-nums text-muted-foreground">
            {filteredCount} of {taskCount}
          </span>
        ) : taskCount > 0 ? (
          <span className="text-xs tabular-nums text-muted-foreground">{taskCount} entries</span>
        ) : null}

        {hasActiveFilters ? (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearFilters}>
            Clear
          </Button>
        ) : null}
      </div>

      {hasActiveFilters ? (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-border/35 px-2.5 pb-2.5 pt-2">
          {filters.statusIds.map((id) => {
            const name = statuses.find((s) => s.id === id)?.name ?? "Status";
            return (
              <Badge key={id} variant="secondary" className="h-6 gap-1 text-[11px]">
                {name}
                <button onClick={() => toggleArrayFilter("statusIds", id)}>
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            );
          })}
          {filters.recurrenceTypes.map((t) => (
            <Badge key={t} variant="secondary" className="h-6 gap-1 text-[11px]">
              <Repeat className="h-2.5 w-2.5" />
              {t.toLowerCase()}
              <button onClick={() => toggleArrayFilter("recurrenceTypes", t)}>
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
