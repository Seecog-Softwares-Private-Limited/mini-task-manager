"use client";

import { useCallback, useMemo, useState, useRef, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import type { Task } from "@/types/api";
import type { WorkflowStatus } from "@/types/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  GripVertical,
  Plus,
  ArrowRight,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Zap,
  Settings2,
  ChevronsLeftRight,
  CheckSquare2,
} from "lucide-react";
import type { BoardPermissions } from "@/hooks/use-board-permissions";
import { TaskCard as EnterpriseTaskCard } from "@/components/kanban/task-card";

// ─── Types ────────────────────────────────────────────────────

export type AssigneeMap = Record<string, { name: string; avatarUrl?: string }>;

export interface BoardFilters {
  search: string;
  priority: string[];
  assignee: string[];
  sortBy: "created" | "priority" | "dueDate" | "title";
  sortDir: "asc" | "desc";
}

export const DEFAULT_FILTERS: BoardFilters = {
  search: "",
  priority: [],
  assignee: [],
  sortBy: "created",
  sortDir: "desc",
};

export interface TaskCardQuickActions {
  onEdit?: (task: Task) => void;
  onChangeStatus?: (task: Task, statusId: string) => void;
  onAssign?: (task: Task, assigneeId: string | null) => void;
  onDelete?: (task: Task) => void;
}

/** Subtask info computed from all tasks on the board */
export interface SubtaskInfo {
  total: number;
  completed: number;
}

// ─── Priority helpers ─────────────────────────────────────────

const PRIORITY_CONFIG: Record<string, { color: string; bg: string; label: string; order: number; stripe: string }> = {
  CRITICAL: { color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500", label: "Critical", order: 0, stripe: "from-purple-500 to-purple-600" },
  HIGH: { color: "text-red-600 dark:text-red-400", bg: "bg-red-500", label: "High", order: 1, stripe: "from-red-500 to-red-600" },
  MEDIUM: { color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500", label: "Medium", order: 2, stripe: "from-amber-500 to-amber-600" },
  LOW: { color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500", label: "Low", order: 3, stripe: "from-emerald-500 to-emerald-600" },
};

const STATUS_COLORS = [
  { dot: "bg-blue-500", ring: "ring-blue-500/20" },
  { dot: "bg-amber-500", ring: "ring-amber-500/20" },
  { dot: "bg-purple-500", ring: "ring-purple-500/20" },
  { dot: "bg-emerald-500", ring: "ring-emerald-500/20" },
  { dot: "bg-red-500", ring: "ring-red-500/20" },
  { dot: "bg-cyan-500", ring: "ring-cyan-500/20" },
];

function getStatusColor(index: number) {
  return STATUS_COLORS[index % STATUS_COLORS.length];
}

// ─── Task Card ────────────────────────────────────────────────

function TaskCard({
  task,
  isOverlay,
  onTaskClick,
  assigneeMap,
  commentCount = 0,
  attachmentCount = 0,
  subtaskInfo,
  statuses,
  boardColumnStatus,
  quickActions,
  isMoving,
  isSelected,
  isSelectionMode,
  onToggleSelect,
  permissions,
}: {
  task: Task;
  isOverlay?: boolean;
  onTaskClick?: (task: Task) => void;
  assigneeMap?: AssigneeMap;
  commentCount?: number;
  attachmentCount?: number;
  subtaskInfo?: SubtaskInfo;
  statuses?: WorkflowStatus[];
  boardColumnStatus?: WorkflowStatus;
  quickActions?: TaskCardQuickActions;
  isMoving?: boolean;
  isSelected?: boolean;
  isSelectionMode?: boolean;
  onToggleSelect?: (taskId: string) => void;
  permissions?: BoardPermissions;
}) {
  return (
    <EnterpriseTaskCard
      task={task}
      isOverlay={isOverlay}
      onTaskClick={onTaskClick}
      assigneeMap={assigneeMap}
      commentCount={commentCount}
      attachmentCount={attachmentCount}
      subtaskInfo={subtaskInfo}
      statuses={statuses}
      boardColumnStatus={boardColumnStatus}
      quickActions={quickActions}
      isMoving={isMoving}
      isSelected={isSelected}
      isSelectionMode={isSelectionMode}
      onToggleSelect={onToggleSelect}
      permissions={permissions}
    />
  );
}

// ─── Draggable Card ───────────────────────────────────────────

function DraggableCard(props: {
  task: Task;
  statusId: string;
  boardColumnStatus?: WorkflowStatus;
  onTaskClick?: (task: Task) => void;
  assigneeMap?: AssigneeMap;
  commentCount?: number;
  attachmentCount?: number;
  subtaskInfo?: SubtaskInfo;
  statuses?: WorkflowStatus[];
  quickActions?: TaskCardQuickActions;
  isMoving?: boolean;
  isSelected?: boolean;
  isSelectionMode?: boolean;
  onToggleSelect?: (taskId: string) => void;
  permissions?: BoardPermissions;
}) {
  const canDrag = !!props.permissions?.canMoveTask && !props.isSelectionMode;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: props.task.id,
    data: { task: props.task, statusId: props.statusId },
    disabled: !canDrag,
  });

  return (
    <div
      ref={setNodeRef}
      {...(canDrag ? listeners : {})}
      {...(canDrag ? attributes : {})}
      className={cn(
        "transition-all duration-200",
        canDrag && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-20 scale-95 pointer-events-none"
      )}
      style={{ touchAction: "none" }}
    >
      <TaskCard {...props} />
    </div>
  );
}

// ─── Quick Add ────────────────────────────────────────────────

function QuickAddInline({ onAdd }: { onAdd: (title: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function handleSubmit() {
    const trimmed = title.trim();
    if (!trimmed) { setEditing(false); return; }
    onAdd(trimmed);
    setTitle("");
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="flex w-full items-center gap-2 rounded-xl border border-dashed border-muted-foreground/15 px-3 py-2.5 text-xs text-muted-foreground/60 transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
      >
        <Plus className="h-3.5 w-3.5" />
        Add task
      </button>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-3 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
      <input
        ref={inputRef}
        type="text"
        placeholder="Task title... (Enter to add, Esc to cancel)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
          if (e.key === "Escape") { setEditing(false); setTitle(""); }
        }}
        onBlur={() => { if (!title.trim()) { setEditing(false); setTitle(""); } }}
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <div className="mt-2 flex items-center gap-2">
        <button type="button" onClick={handleSubmit}
          className="rounded-lg gradient-bg px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:brightness-110 transition-all">
          Add
        </button>
        <button type="button" onClick={() => { setEditing(false); setTitle(""); }}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
          Cancel
        </button>
        <span className="ml-auto text-[10px] text-muted-foreground/50">
          <kbd className="rounded border bg-muted px-1 py-0.5 text-[9px] font-mono">Enter</kbd>
        </span>
      </div>
    </div>
  );
}

// ─── Column Header Dropdown ───────────────────────────────────

function ColumnSettingsDropdown({
  status,
  taskCount,
  wipLimit,
  collapsed,
  onToggleCollapse,
  onSetWipLimit,
  onSelectAll,
  permissions,
}: {
  status: WorkflowStatus;
  taskCount: number;
  wipLimit?: number;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onSetWipLimit?: (limit: number | undefined) => void;
  onSelectAll?: () => void;
  permissions?: BoardPermissions;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-muted/60 transition-colors opacity-0 group-hover/col:opacity-100">
          <Settings2 className="h-3.5 w-3.5 text-muted-foreground/60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs">{status.name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onToggleCollapse}>
          <ChevronsLeftRight className="mr-2 h-3.5 w-3.5" />
          {collapsed ? "Expand column" : "Collapse column"}
        </DropdownMenuItem>
        {onSelectAll && permissions?.canBulkSelect && (
          <DropdownMenuItem onClick={onSelectAll}>
            <CheckSquare2 className="mr-2 h-3.5 w-3.5" />
            Select all ({taskCount})
          </DropdownMenuItem>
        )}
        {onSetWipLimit && permissions?.canManageBoard && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] text-muted-foreground">WIP Limit</DropdownMenuLabel>
            {[3, 5, 8, 10].map((n) => (
              <DropdownMenuItem
                key={n}
                onClick={() => onSetWipLimit(n)}
                className={cn(wipLimit === n && "bg-primary/5 text-primary")}
              >
                {n} tasks {wipLimit === n && "✓"}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem onClick={() => onSetWipLimit(undefined)}>
              No limit {!wipLimit && "✓"}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Droppable Column ─────────────────────────────────────────

function DroppableColumn({
  status,
  statusIndex,
  tasks,
  onQuickAdd,
  onTaskClick,
  assigneeMap,
  commentCountMap,
  attachmentCountMap,
  subtaskMap,
  allStatuses,
  quickActions,
  activeOverColumnId,
  wipLimit,
  collapsed,
  onToggleCollapse,
  movingTaskId,
  isSelectionMode,
  selectedIds,
  onToggleSelect,
  onSelectColumnTasks,
  onSetWipLimit,
  permissions,
}: {
  status: WorkflowStatus;
  statusIndex: number;
  tasks: Task[];
  onQuickAdd?: (title: string, statusId: string) => void;
  onTaskClick?: (task: Task) => void;
  assigneeMap?: AssigneeMap;
  commentCountMap?: Record<string, number>;
  attachmentCountMap?: Record<string, number>;
  subtaskMap?: Record<string, SubtaskInfo>;
  allStatuses?: WorkflowStatus[];
  quickActions?: TaskCardQuickActions;
  activeOverColumnId?: string | null;
  wipLimit?: number;
  collapsed?: boolean;
  onToggleCollapse?: (statusId: string) => void;
  movingTaskId?: string | null;
  isSelectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (taskId: string) => void;
  onSelectColumnTasks?: (statusId: string) => void;
  onSetWipLimit?: (statusId: string, limit: number | undefined) => void;
  permissions?: BoardPermissions;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: status.id,
    data: { statusId: status.id },
  });

  const colorSet = getStatusColor(statusIndex);
  const isActiveTarget = isOver || activeOverColumnId === status.id;
  const isOverWipLimit = wipLimit ? tasks.length > wipLimit : false;
  const isAtWipLimit = wipLimit ? tasks.length === wipLimit : false;

  // Collapsed state
  if (collapsed) {
    return (
      <div
        ref={setNodeRef}
        className={cn(
          "flex w-12 shrink-0 flex-col items-center rounded-2xl border transition-all duration-300 cursor-pointer hover:bg-muted/30",
          isActiveTarget && "ring-2 ring-primary/40 border-primary/30 bg-primary/[0.03]"
        )}
        onClick={() => onToggleCollapse?.(status.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter") onToggleCollapse?.(status.id); }}
        aria-label={`Expand column: ${status.name}`}
      >
        <div className="py-4 px-1">
          <ChevronRight className="h-4 w-4 text-muted-foreground mb-2 mx-auto" />
          <span className={cn("h-2.5 w-2.5 rounded-full block mx-auto", colorSet.dot)} />
          <p className="mt-3 text-[10px] font-semibold text-muted-foreground [writing-mode:vertical-lr] rotate-180 whitespace-nowrap">
            {status.name}
          </p>
          <span className="mt-2 block text-center text-[10px] font-semibold text-muted-foreground tabular-nums">
            {tasks.length}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      data-cy={`kanban-column-${status.id}`}
      className={cn(
        "group/col flex h-full min-h-0 min-w-[310px] flex-1 flex-col rounded-2xl border transition-all duration-300",
        isActiveTarget
          ? "ring-2 ring-primary/40 border-primary/30 bg-primary/[0.03] shadow-lg shadow-primary/10 scale-[1.01]"
          : "bg-muted/15 hover:bg-muted/20",
        isOverWipLimit && !isActiveTarget && "border-red-500/30 bg-red-500/[0.02]"
      )}
      aria-label={`Column: ${status.name}`}
    >
      {/* Header — fixed at top of column; only task list below scrolls */}
      <div className="sticky top-0 z-10 flex shrink-0 items-center gap-2 border-b bg-muted/15 px-4 py-3 backdrop-blur-sm dark:bg-muted/20">
        <button
          onClick={() => onToggleCollapse?.(status.id)}
          className="flex items-center gap-2 hover:opacity-70 transition-opacity"
          aria-label={`Collapse ${status.name}`}
        >
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/50" />
          <span className={cn("h-2.5 w-2.5 rounded-full ring-2", colorSet.dot, colorSet.ring)} />
          <h3 className="text-sm font-semibold text-foreground">{status.name}</h3>
        </button>

        <div className="flex-1" />

        <span className={cn(
          "rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums transition-colors",
          isOverWipLimit
            ? "bg-red-500/15 text-red-600 dark:text-red-400 animate-pulse"
            : isAtWipLimit
              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
              : "bg-muted text-muted-foreground"
        )}>
          {tasks.length}
          {wipLimit ? `/${wipLimit}` : ""}
        </span>

        <ColumnSettingsDropdown
          status={status}
          taskCount={tasks.length}
          wipLimit={wipLimit}
          collapsed={collapsed}
          onToggleCollapse={() => onToggleCollapse?.(status.id)}
          onSetWipLimit={onSetWipLimit ? (limit) => onSetWipLimit(status.id, limit) : undefined}
          onSelectAll={onSelectColumnTasks ? () => onSelectColumnTasks(status.id) : undefined}
          permissions={permissions}
        />
      </div>

      {/* WIP warning */}
      {isOverWipLimit && (
        <div className="mx-3 mt-2 flex shrink-0 items-center gap-1.5 rounded-lg bg-red-500/10 border border-red-500/20 px-2.5 py-1.5 animate-in fade-in duration-200">
          <AlertCircle className="h-3 w-3 text-red-500 shrink-0" />
          <span className="text-[10px] font-medium text-red-600 dark:text-red-400">
            WIP limit exceeded ({tasks.length}/{wipLimit})
          </span>
        </div>
      )}

      {/* Cards — only this area scrolls vertically */}
      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto overscroll-y-contain p-3 scrollbar-thin">
        {tasks.map((task) => (
          <DraggableCard
            key={task.id}
            task={task}
            statusId={status.id}
            boardColumnStatus={status}
            onTaskClick={onTaskClick}
            assigneeMap={assigneeMap}
            commentCount={commentCountMap?.[task.id]}
            attachmentCount={attachmentCountMap?.[task.id]}
            subtaskInfo={subtaskMap?.[task.id]}
            statuses={allStatuses}
            quickActions={quickActions}
            isMoving={movingTaskId === task.id}
            isSelected={selectedIds?.has(task.id)}
            isSelectionMode={isSelectionMode}
            onToggleSelect={onToggleSelect}
            permissions={permissions}
          />
        ))}

        {/* Empty */}
        {tasks.length === 0 && !isActiveTarget && (
          <div className="flex flex-1 items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/10 p-6">
            <div className="text-center">
              <Zap className="h-5 w-5 mx-auto text-muted-foreground/20 mb-1" />
              <p className="text-xs text-muted-foreground/40">No tasks</p>
            </div>
          </div>
        )}

        {/* Drop placeholder */}
        {isActiveTarget && (
          <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-4 text-center transition-all animate-in fade-in slide-in-from-top-1 duration-200">
            <p className="text-xs text-primary/60 font-medium">Drop here</p>
          </div>
        )}
      </div>

      {/* Quick add */}
      {onQuickAdd && !permissions?.isViewer && (
        <div className="shrink-0 p-3 pt-0">
          <QuickAddInline onAdd={(title) => onQuickAdd(title, status.id)} />
        </div>
      )}
    </div>
  );
}

// ─── Filter & Sort ────────────────────────────────────────────

function applyFilters(tasks: Task[], filters: BoardFilters): Task[] {
  let result = tasks;
  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(
      (t) => t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q)
    );
  }
  if (filters.priority.length > 0) {
    result = result.filter((t) => filters.priority.includes(t.priority));
  }
  if (filters.assignee.length > 0) {
    result = result.filter((t) => {
      const taskAssignees = t.assigneeIds?.length
        ? t.assigneeIds
        : t.assigneeId
          ? [t.assigneeId]
          : [];
      return taskAssignees.some((id) => filters.assignee.includes(id));
    });
  }
  return result;
}

function applySorting(tasks: Task[], sortBy: string, sortDir: string): Task[] {
  const sorted = [...tasks];
  sorted.sort((a, b) => {
    let cmp = 0;
    switch (sortBy) {
      case "priority":
        cmp = (PRIORITY_CONFIG[a.priority]?.order ?? 99) - (PRIORITY_CONFIG[b.priority]?.order ?? 99);
        break;
      case "dueDate":
        cmp = (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999");
        break;
      case "title":
        cmp = a.title.localeCompare(b.title);
        break;
      default:
        cmp = a.createdAt.localeCompare(b.createdAt);
        break;
    }
    return sortDir === "desc" ? -cmp : cmp;
  });
  return sorted;
}

// ─── Board Stats ──────────────────────────────────────────────

export interface BoardStats {
  total: number;
  overdue: number;
  completedPercent: number;
  inProgress: number;
}

export function computeBoardStats(tasks: Task[], statuses: WorkflowStatus[]): BoardStats {
  const total = tasks.length;
  const now = new Date();
  const overdue = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < now).length;
  const doneStatus = statuses.find((s) => s.type === "DONE" || s.name.toLowerCase() === "done");
  const completed = doneStatus ? tasks.filter((t) => t.statusId === doneStatus.id).length : 0;
  const completedPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const inProgressStatus = statuses.find((s) => s.type === "IN_PROGRESS" || s.name.toLowerCase().includes("progress"));
  const inProgress = inProgressStatus ? tasks.filter((t) => t.statusId === inProgressStatus.id).length : 0;
  return { total, overdue, completedPercent, inProgress };
}

// ─── Compute subtask map ──────────────────────────────────────

export function computeSubtaskMap(allTasks: Task[], doneStatusId?: string): Record<string, SubtaskInfo> {
  const map: Record<string, SubtaskInfo> = {};
  for (const t of allTasks) {
    if (t.parentTaskId) {
      if (!map[t.parentTaskId]) map[t.parentTaskId] = { total: 0, completed: 0 };
      map[t.parentTaskId].total++;
      if (doneStatusId && t.statusId === doneStatusId) {
        map[t.parentTaskId].completed++;
      }
    }
  }
  return map;
}

// ─── Main Board ───────────────────────────────────────────────

export interface KanbanBoardProps {
  statuses: WorkflowStatus[];
  tasksByStatus: Record<string, Task[]>;
  onMoveTask: (taskId: string, fromStatusId: string | null, toStatusId: string) => void;
  onQuickAdd?: (title: string, statusId: string) => void;
  onTaskClick?: (task: Task) => void;
  assigneeMap?: AssigneeMap;
  commentCountMap?: Record<string, number>;
  attachmentCountMap?: Record<string, number>;
  subtaskMap?: Record<string, SubtaskInfo>;
  filters?: BoardFilters;
  quickActions?: TaskCardQuickActions;
  wipLimits?: Record<string, number>;
  movingTaskId?: string | null;
  collapsedColumns?: Record<string, boolean>;
  onToggleColumnCollapse?: (statusId: string) => void;
  isSelectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (taskId: string) => void;
  onSelectColumnTasks?: (statusId: string) => void;
  onSetWipLimit?: (statusId: string, limit: number | undefined) => void;
  permissions?: BoardPermissions;
  "aria-label"?: string;
  className?: string;
}

export function KanbanBoard({
  statuses,
  tasksByStatus,
  onMoveTask,
  onQuickAdd,
  onTaskClick,
  assigneeMap,
  commentCountMap,
  attachmentCountMap,
  subtaskMap,
  filters = DEFAULT_FILTERS,
  quickActions,
  wipLimits,
  movingTaskId,
  collapsedColumns,
  onToggleColumnCollapse,
  isSelectionMode,
  selectedIds,
  onToggleSelect,
  onSelectColumnTasks,
  onSetWipLimit,
  permissions,
  "aria-label": ariaLabel = "Kanban board",
  className,
}: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);

  const canDrag = !!permissions?.canMoveTask && !isSelectionMode;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const activeTask = useMemo(() => {
    if (!activeId) return null;
    for (const tasks of Object.values(tasksByStatus)) {
      const t = tasks.find((x) => x.id === activeId);
      if (t) return t;
    }
    return null;
  }, [activeId, tasksByStatus]);

  const overlayBoardColumnStatus = useMemo(() => {
    if (!activeId) return undefined;
    for (const s of statuses) {
      if ((tasksByStatus[s.id] ?? []).some((t) => t.id === activeId)) return s;
    }
    return undefined;
  }, [activeId, tasksByStatus, statuses]);

  const filteredTasksByStatus = useMemo(() => {
    const result: Record<string, Task[]> = {};
    for (const [statusId, tasks] of Object.entries(tasksByStatus)) {
      const filtered = applyFilters(tasks, filters);
      result[statusId] = applySorting(filtered, filters.sortBy, filters.sortDir);
    }
    return result;
  }, [tasksByStatus, filters]);

  const handleDragStart = useCallback((e: DragStartEvent) => {
    if (!canDrag) return;
    setActiveId(e.active.id as string);
  }, [canDrag]);

  const handleDragOver = useCallback((e: DragOverEvent) => {
    const overId = e.over?.id as string | undefined;
    if (overId && statuses.some((s) => s.id === overId)) {
      setOverColumnId(overId);
    } else {
      setOverColumnId(null);
    }
  }, [statuses]);

  const handleDragEnd = useCallback(
    (e: DragEndEvent) => {
      setActiveId(null);
      setOverColumnId(null);
      const { active, over } = e;
      if (!over) return;
      const taskId = active.id as string;
      const toStatusId = over.id as string;
      const fromData = active.data.current as { task: Task; statusId: string } | undefined;
      const fromStatusId = fromData?.statusId ?? null;
      if (toStatusId && toStatusId !== fromStatusId) {
        onMoveTask(taskId, fromStatusId, toStatusId);
      }
    },
    [onMoveTask]
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setOverColumnId(null);
  }, []);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      accessibility={{
        screenReaderInstructions: {
          draggable: "Press space to pick up. Use arrow keys to move. Press space to drop.",
        },
      }}
    >
      <div
        className={cn(
          "flex h-full min-h-0 w-full gap-4 overflow-x-auto overflow-y-hidden pb-2",
          className
        )}
        role="region"
        aria-label={ariaLabel}
      >
        {statuses.map((status, idx) => (
          <DroppableColumn
            key={status.id}
            status={status}
            statusIndex={idx}
            tasks={filteredTasksByStatus[status.id] ?? []}
            onQuickAdd={onQuickAdd}
            onTaskClick={onTaskClick}
            assigneeMap={assigneeMap}
            commentCountMap={commentCountMap}
            attachmentCountMap={attachmentCountMap}
            subtaskMap={subtaskMap}
            allStatuses={statuses}
            quickActions={quickActions}
            activeOverColumnId={overColumnId}
            wipLimit={wipLimits?.[status.id]}
            collapsed={collapsedColumns?.[status.id]}
            onToggleCollapse={onToggleColumnCollapse}
            movingTaskId={movingTaskId}
            isSelectionMode={isSelectionMode}
            selectedIds={selectedIds}
            onToggleSelect={onToggleSelect}
            onSelectColumnTasks={onSelectColumnTasks}
            onSetWipLimit={onSetWipLimit}
            permissions={permissions}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 250, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
        {activeTask ? (
          <div className="w-[290px]">
            <TaskCard
              task={activeTask}
              isOverlay
              assigneeMap={assigneeMap}
              commentCount={commentCountMap?.[activeTask.id]}
              attachmentCount={attachmentCountMap?.[activeTask.id]}
              subtaskInfo={subtaskMap?.[activeTask.id]}
              statuses={statuses}
              boardColumnStatus={overlayBoardColumnStatus}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
