"use client";

import { useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/ui/user-avatar";
import { AssigneeBulkActions } from "@/components/tasks/assignee-bulk-actions";
import type { BoardFilters, AssigneeMap } from "./kanban-board";
import {
  Search,
  ArrowUpDown,
  Flag,
  User,
  LayoutGrid,
  List,
  X,
  Bookmark,
  BookmarkPlus,
  CheckSquare2,
  Rocket,
  Repeat,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────

const PRIORITIES = [
  { value: "CRITICAL", label: "Critical", color: "bg-purple-500" },
  { value: "HIGH", label: "High", color: "bg-red-500" },
  { value: "MEDIUM", label: "Medium", color: "bg-amber-500" },
  { value: "LOW", label: "Low", color: "bg-emerald-500" },
];

const SORT_OPTIONS = [
  { value: "created", label: "Date created" },
  { value: "completed", label: "Date completed" },
  { value: "priority", label: "Priority" },
  { value: "dueDate", label: "Due date" },
  { value: "title", label: "Title" },
] as const;

export type ViewMode = "kanban" | "scrum" | "table";

// ─── Saved View types ─────────────────────────────────────────

export interface SavedView {
  id: string;
  name: string;
  filters: BoardFilters;
}

// ─── Props ────────────────────────────────────────────────────

interface BoardToolbarProps {
  filters: BoardFilters;
  onFiltersChange: (filters: BoardFilters) => void;
  assigneeMap?: AssigneeMap;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  taskCount?: number;
  filteredCount?: number;
  recurringCount?: number;
  savedViews?: SavedView[];
  onSaveView?: (name: string, filters: BoardFilters) => void;
  onLoadView?: (view: SavedView) => void;
  onDeleteView?: (viewId: string) => void;
  isSelectionMode?: boolean;
  onToggleSelectionMode?: () => void;
  canBulkSelect?: boolean;
  showRecurrenceFilter?: boolean;
}

const FILTER_BTN = cn(
  "h-[26px] gap-1.5 rounded-lg border-border/60 text-xs font-medium transition-all duration-200",
  "hover:border-border hover:bg-muted/30"
);

const SEGMENTED_WRAP = "inline-flex items-center rounded-lg border border-border/60 bg-muted/20 p-0.5";
const SEGMENTED_ITEM = (active: boolean) =>
  cn(
    "h-[26px] rounded-md px-2.5 text-xs font-medium transition-all duration-200",
    active
      ? "bg-background text-foreground shadow-sm"
      : "text-muted-foreground hover:text-foreground"
  );

export function BoardToolbar({
  filters,
  onFiltersChange,
  assigneeMap,
  viewMode,
  onViewModeChange,
  taskCount = 0,
  filteredCount,
  recurringCount = 0,
  savedViews = [],
  onSaveView,
  onLoadView,
  onDeleteView,
  isSelectionMode,
  onToggleSelectionMode,
  canBulkSelect,
  showRecurrenceFilter = false,
}: BoardToolbarProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [saveViewName, setSaveViewName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);

  const hasActiveFilters =
    filters.search.length > 0 ||
    filters.priority.length > 0 ||
    filters.assignee.length > 0 ||
    (showRecurrenceFilter && filters.recurrence !== "all") ||
    filters.sortBy !== "completed" ||
    filters.sortDir !== "asc";

  const updateFilter = useCallback(<K extends keyof BoardFilters>(key: K, value: BoardFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  }, [filters, onFiltersChange]);

  const toggleArrayFilter = useCallback((key: "priority" | "assignee", value: string) => {
    const current = filters[key];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    updateFilter(key, next);
  }, [filters, updateFilter]);

  function clearFilters() {
    onFiltersChange({
      search: "",
      priority: [],
      assignee: [],
      recurrence: "normal",
      sortBy: "completed",
      sortDir: "asc",
    });
  }

  function removePriorityFilter(value: string) {
    updateFilter("priority", filters.priority.filter((v) => v !== value));
  }

  function removeAssigneeFilter(userId: string) {
    updateFilter("assignee", filters.assignee.filter((v) => v !== userId));
  }

  function handleSaveView() {
    if (saveViewName.trim() && onSaveView) {
      onSaveView(saveViewName.trim(), { ...filters });
      setSaveViewName("");
      setShowSaveInput(false);
    }
  }

  const assigneeEntries = Object.entries(assigneeMap ?? {});
  const allAssigneesFilterSelected =
    assigneeEntries.length > 0 &&
    assigneeEntries.every(([userId]) => filters.assignee.includes(userId));
  const selectedAssigneeFilterCount = assigneeEntries.filter(([userId]) =>
    filters.assignee.includes(userId)
  ).length;

  function toggleAllAssigneeFilters() {
    if (allAssigneesFilterSelected) {
      updateFilter("assignee", []);
      return;
    }
    updateFilter("assignee", assigneeEntries.map(([userId]) => userId));
  }

  return (
    <div className="min-w-0 space-y-1.5">
      <div className="flex min-w-0 flex-wrap items-center gap-1">
        <div className="relative w-full min-w-[11rem] shrink-0 sm:w-52 md:w-60">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
          <Input
            ref={searchInputRef}
            placeholder="Search tasks..."
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="h-8 rounded-lg pl-8 pr-8 text-sm transition-colors duration-200"
            data-cy="board-search"
            aria-label="Search tasks"
          />
          {filters.search ? (
            <button
              type="button"
              aria-label="Clear search"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                updateFilter("search", "");
                searchInputRef.current?.focus({ preventScroll: true });
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 transition-colors hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        {/* Priority filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                FILTER_BTN,
                filters.priority.length > 0 && "border-violet-400/40 bg-violet-50/50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300"
              )}
            >
              <Flag className="h-3.5 w-3.5" />
              Priority
              {filters.priority.length > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {filters.priority.length}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            <DropdownMenuLabel className="text-xs">Filter by priority</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {PRIORITIES.map((p) => (
              <DropdownMenuCheckboxItem
                key={p.value}
                checked={filters.priority.includes(p.value)}
                onCheckedChange={() => toggleArrayFilter("priority", p.value)}
              >
                <span className="flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full", p.color)} />
                  {p.label}
                </span>
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Assignee filter */}
        {assigneeEntries.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  FILTER_BTN,
                  filters.assignee.length > 0 && "border-violet-400/40 bg-violet-50/50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300"
                )}
              >
                <User className="h-3.5 w-3.5" />
                Assignee
                {filters.assignee.length > 0 && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {filters.assignee.length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-80 max-h-80 overflow-y-auto p-0">
              <div className="p-3 pb-2">
                <DropdownMenuLabel className="px-0 text-xs">Filter by assignee</DropdownMenuLabel>
              </div>
              <AssigneeBulkActions
                filteredCount={assigneeEntries.length}
                allSelected={allAssigneesFilterSelected}
                selectedCount={selectedAssigneeFilterCount}
                onToggleSelectAll={toggleAllAssigneeFilters}
                clearLabel="Clear filters"
                onClear={() => updateFilter("assignee", [])}
              />
              <DropdownMenuSeparator />
              <div className="max-h-60 overflow-y-auto px-1 pb-1">
              {assigneeEntries.map(([userId, info]) => (
                <DropdownMenuCheckboxItem
                  key={userId}
                  checked={filters.assignee.includes(userId)}
                  onCheckedChange={() => toggleArrayFilter("assignee", userId)}
                  className="items-center py-2"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <UserAvatar
                      userId={userId}
                      name={info.name}
                      avatarUrl={info.avatarUrl}
                      className="h-6 w-6"
                      fallbackClassName="text-[9px]"
                    />
                    <span className="min-w-0 flex-1 break-all text-sm leading-snug">
                      {info.name}
                    </span>
                  </div>
                </DropdownMenuCheckboxItem>
              ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Sort dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                FILTER_BTN,
                (filters.sortBy !== "completed" || filters.sortDir !== "asc") &&
                  "border-violet-400/40 bg-violet-50/50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300"
              )}
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              Sort
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            <DropdownMenuLabel className="text-xs">Sort by</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {SORT_OPTIONS.map((opt) => (
              <DropdownMenuCheckboxItem
                key={opt.value}
                checked={filters.sortBy === opt.value}
                onCheckedChange={() => updateFilter("sortBy", opt.value)}
              >
                {opt.label}
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={filters.sortDir === "asc"}
              onCheckedChange={() => updateFilter("sortDir", "asc")}
            >
              Ascending
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filters.sortDir === "desc"}
              onCheckedChange={() => updateFilter("sortDir", "desc")}
            >
              Descending
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {showRecurrenceFilter ? (
        <div className={SEGMENTED_WRAP}>
          <button
            type="button"
            className={SEGMENTED_ITEM(filters.recurrence === "all")}
            onClick={() => updateFilter("recurrence", "all")}
          >
            All
          </button>
          <button
            type="button"
            className={SEGMENTED_ITEM(filters.recurrence === "normal")}
            onClick={() => updateFilter("recurrence", "normal")}
          >
            Normal
          </button>
        </div>
        ) : null}

        {/* Saved views dropdown */}
        {(savedViews.length > 0 || onSaveView) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className={FILTER_BTN}>
                <Bookmark className="h-3.5 w-3.5" />
                Views
                {savedViews.length > 0 && (
                  <span className="text-[10px] text-muted-foreground">({savedViews.length})</span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuLabel className="text-xs">Saved views</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {savedViews.length === 0 && (
                <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                  No saved views yet
                </div>
              )}
              {savedViews.map((view) => (
                <div key={view.id} className="flex items-center gap-1 px-2 py-1 hover:bg-muted/50 rounded-sm group">
                  <button
                    className="flex-1 text-left text-sm truncate"
                    onClick={() => onLoadView?.(view)}
                  >
                    {view.name}
                  </button>
                  <button
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-0.5"
                    onClick={() => onDeleteView?.(view.id)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {onSaveView && hasActiveFilters && (
                <>
                  <DropdownMenuSeparator />
                  {showSaveInput ? (
                    <div className="px-2 py-1.5 flex gap-1">
                      <Input
                        autoFocus
                        placeholder="View name..."
                        value={saveViewName}
                        onChange={(e) => setSaveViewName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveView();
                          if (e.key === "Escape") setShowSaveInput(false);
                        }}
                        className="h-7 text-xs"
                      />
                      <Button size="sm" className="h-7 px-2 text-xs" onClick={handleSaveView} disabled={!saveViewName.trim()}>
                        Save
                      </Button>
                    </div>
                  ) : (
                    <button
                      className="flex w-full items-center gap-2 px-2 py-1.5 text-sm text-primary hover:bg-muted/50 rounded-sm"
                      onClick={() => setShowSaveInput(true)}
                    >
                      <BookmarkPlus className="h-3.5 w-3.5" />
                      Save current view
                    </button>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Clear all filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-muted-foreground transition-colors duration-200 hover:text-destructive"
            onClick={clearFilters}
          >
            <X className="h-3.5 w-3.5" />
            Clear all
          </Button>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Task count */}
        {filteredCount !== undefined && filteredCount !== taskCount ? (
          <span className="text-xs text-muted-foreground tabular-nums">
            {filteredCount} of {taskCount} tasks
          </span>
        ) : taskCount > 0 ? (
          <span className="text-xs text-muted-foreground tabular-nums">
            {taskCount} tasks
          </span>
        ) : null}

        {/* Bulk select toggle */}
        {canBulkSelect && onToggleSelectionMode && (viewMode === "kanban" || viewMode === "scrum") && (
          <Button
            variant={isSelectionMode ? "default" : "outline"}
            size="sm"
            className={cn(FILTER_BTN, isSelectionMode && "border-primary bg-primary text-primary-foreground")}
            onClick={onToggleSelectionMode}
          >
            <CheckSquare2 className="h-3.5 w-3.5" />
            {isSelectionMode ? "Exit Select" : "Select"}
          </Button>
        )}

        {/* View toggle: Kanban | Scrum | Table */}
        <div className={SEGMENTED_WRAP}>
          <button
            onClick={() => onViewModeChange("kanban")}
            className={cn(SEGMENTED_ITEM(viewMode === "kanban"), "flex items-center gap-1")}
            aria-label="Kanban view"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Kanban
          </button>
          <button
            onClick={() => onViewModeChange("scrum")}
            className={cn(SEGMENTED_ITEM(viewMode === "scrum"), "flex items-center gap-1")}
            aria-label="Scrum view"
          >
            <Rocket className="h-3.5 w-3.5" />
            Scrum
          </button>
          <button
            onClick={() => onViewModeChange("table")}
            className={cn(SEGMENTED_ITEM(viewMode === "table"), "flex items-center gap-1")}
            aria-label="Table view"
          >
            <List className="h-3.5 w-3.5" />
            Table
          </button>
        </div>
      </div>

      {/* Active filter chips row */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
          <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-semibold mr-1">
            Active:
          </span>

          {/* Search chip */}
          {filters.search && (
            <Badge variant="secondary" className="h-6 gap-1 pl-2 pr-1 text-[11px] font-medium">
              <Search className="h-2.5 w-2.5" />
              &quot;{filters.search}&quot;
              <button
                onClick={() => updateFilter("search", "")}
                className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-muted-foreground/20"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          )}

          {/* Priority chips */}
          {filters.priority.map((p) => {
            const config = PRIORITIES.find((x) => x.value === p);
            return (
              <Badge key={p} variant="secondary" className="h-6 gap-1 pl-2 pr-1 text-[11px] font-medium">
                <span className={cn("h-1.5 w-1.5 rounded-full", config?.color)} />
                {config?.label ?? p}
                <button
                  onClick={() => removePriorityFilter(p)}
                  className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5 transition-colors"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            );
          })}

          {/* Assignee chips */}
          {filters.assignee.map((userId) => {
            const info = assigneeMap?.[userId];
            return (
              <Badge key={userId} variant="secondary" className="h-6 max-w-[12rem] gap-1 pl-1.5 pr-1 text-[11px] font-medium">
                <UserAvatar
                  userId={userId}
                  name={info?.name}
                  avatarUrl={info?.avatarUrl}
                  className="h-3.5 w-3.5"
                  fallbackClassName="text-[6px]"
                />
                <span className="truncate">{info?.name ?? userId.slice(0, 8)}</span>
                <button
                  onClick={() => removeAssigneeFilter(userId)}
                  className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5 transition-colors"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            );
          })}

          {/* Recurrence chip */}
          {showRecurrenceFilter && filters.recurrence !== "all" && (
            <Badge variant="secondary" className="h-6 gap-1 pl-2 pr-1 text-[11px] font-medium">
              <Repeat className="h-2.5 w-2.5" />
              Normal tasks
              <button
                onClick={() => updateFilter("recurrence", "all")}
                className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5 transition-colors"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          )}

          {/* Sort chip */}
          {(filters.sortBy !== "completed" || filters.sortDir !== "asc") && (
            <Badge variant="secondary" className="h-6 gap-1 pl-2 pr-1 text-[11px] font-medium">
              <ArrowUpDown className="h-2.5 w-2.5" />
              {SORT_OPTIONS.find((o) => o.value === filters.sortBy)?.label}
              {filters.sortDir === "asc" ? " ↑" : " ↓"}
              <button
                onClick={() => { updateFilter("sortBy", "completed"); updateFilter("sortDir", "asc"); }}
                className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5 transition-colors"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
