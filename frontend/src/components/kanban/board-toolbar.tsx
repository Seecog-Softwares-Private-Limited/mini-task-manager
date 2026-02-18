"use client";

import { useState, useCallback } from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  { value: "priority", label: "Priority" },
  { value: "dueDate", label: "Due date" },
  { value: "title", label: "Title" },
] as const;

export type ViewMode = "kanban" | "table";

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
  savedViews?: SavedView[];
  onSaveView?: (name: string, filters: BoardFilters) => void;
  onLoadView?: (view: SavedView) => void;
  onDeleteView?: (viewId: string) => void;
  isSelectionMode?: boolean;
  onToggleSelectionMode?: () => void;
  canBulkSelect?: boolean;
}

// ─── Component ────────────────────────────────────────────────

export function BoardToolbar({
  filters,
  onFiltersChange,
  assigneeMap,
  viewMode,
  onViewModeChange,
  taskCount = 0,
  filteredCount,
  savedViews = [],
  onSaveView,
  onLoadView,
  onDeleteView,
  isSelectionMode,
  onToggleSelectionMode,
  canBulkSelect,
}: BoardToolbarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [saveViewName, setSaveViewName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);

  const hasActiveFilters =
    filters.search.length > 0 ||
    filters.priority.length > 0 ||
    filters.assignee.length > 0 ||
    filters.sortBy !== "created";

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
      sortBy: "created",
      sortDir: "desc",
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

  return (
    <div className="space-y-2">
      {/* Main toolbar row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className={cn(
          "relative transition-all duration-300",
          searchOpen || filters.search ? "w-64" : "w-auto"
        )}>
          {searchOpen || filters.search ? (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
              <Input
                autoFocus
                placeholder="Search tasks..."
                value={filters.search}
                onChange={(e) => updateFilter("search", e.target.value)}
                className="h-9 pl-9 pr-8 text-sm"
                onBlur={() => {
                  if (!filters.search) setSearchOpen(false);
                }}
                data-cy="board-search"
              />
              {filters.search && (
                <button
                  onClick={() => {
                    updateFilter("search", "");
                    setSearchOpen(false);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-2 text-muted-foreground"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="h-3.5 w-3.5" />
              Search
            </Button>
          )}
        </div>

        {/* Priority filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-9 gap-2",
                filters.priority.length > 0 && "border-primary/30 bg-primary/5 text-primary"
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
                  "h-9 gap-2",
                  filters.assignee.length > 0 && "border-primary/30 bg-primary/5 text-primary"
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
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuLabel className="text-xs">Filter by assignee</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {assigneeEntries.map(([userId, info]) => (
                <DropdownMenuCheckboxItem
                  key={userId}
                  checked={filters.assignee.includes(userId)}
                  onCheckedChange={() => toggleArrayFilter("assignee", userId)}
                >
                  <span className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={info.avatarUrl} />
                      <AvatarFallback className="text-[8px]">
                        {info.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate">{info.name}</span>
                  </span>
                </DropdownMenuCheckboxItem>
              ))}
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
                "h-9 gap-2",
                filters.sortBy !== "created" && "border-primary/30 bg-primary/5 text-primary"
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
              onCheckedChange={() => updateFilter("sortDir", filters.sortDir === "asc" ? "desc" : "asc")}
            >
              Ascending
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Saved views dropdown */}
        {(savedViews.length > 0 || onSaveView) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-2">
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
            className="h-9 gap-1.5 text-muted-foreground hover:text-destructive"
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
        {canBulkSelect && onToggleSelectionMode && viewMode === "kanban" && (
          <Button
            variant={isSelectionMode ? "default" : "outline"}
            size="sm"
            className="h-9 gap-1.5"
            onClick={onToggleSelectionMode}
          >
            <CheckSquare2 className="h-3.5 w-3.5" />
            {isSelectionMode ? "Exit Select" : "Select"}
          </Button>
        )}

        {/* View toggle */}
        <div className="flex items-center rounded-lg border bg-muted/30 p-0.5">
          <button
            onClick={() => onViewModeChange("kanban")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all",
              viewMode === "kanban"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            aria-label="Kanban view"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Board
          </button>
          <button
            onClick={() => onViewModeChange("table")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all",
              viewMode === "table"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
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
                onClick={() => { updateFilter("search", ""); setSearchOpen(false); }}
                className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5 transition-colors"
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
              <Badge key={userId} variant="secondary" className="h-6 gap-1 pl-1.5 pr-1 text-[11px] font-medium">
                <Avatar className="h-3.5 w-3.5">
                  <AvatarImage src={info?.avatarUrl} />
                  <AvatarFallback className="text-[6px]">
                    {(info?.name ?? "?").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {info?.name ?? userId.slice(0, 8)}
                <button
                  onClick={() => removeAssigneeFilter(userId)}
                  className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5 transition-colors"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            );
          })}

          {/* Sort chip */}
          {filters.sortBy !== "created" && (
            <Badge variant="secondary" className="h-6 gap-1 pl-2 pr-1 text-[11px] font-medium">
              <ArrowUpDown className="h-2.5 w-2.5" />
              {SORT_OPTIONS.find((o) => o.value === filters.sortBy)?.label}
              {filters.sortDir === "asc" ? " ↑" : " ↓"}
              <button
                onClick={() => { updateFilter("sortBy", "created"); updateFilter("sortDir", "desc"); }}
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
