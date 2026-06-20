"use client";

import { useCallback, useMemo, useState, useRef, useEffect } from "react";
import { applyBoardSorting } from "@/lib/board-sort";
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
import { APP_LABEL_UPPER } from "@/lib/ui/design-tokens";
import type { Task, WorkflowStatus, RecurringTemplateSummary } from "@/types/api";
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
import { canUserMoveTask } from "@/lib/task-assignees";
import { TaskCard as EnterpriseTaskCard, getWorkflowStatusCategory } from "@/components/kanban/task-card";
import { partitionBoardTasks } from "@/lib/recurrence-display";
import {
  getRecurringColumnHint,
  getRecurringEmptyColumnMessage,
} from "@/lib/recurring-board-utils";

// ─── Types ────────────────────────────────────────────────────

export type AssigneeMap = Record<string, { name: string; avatarUrl?: string }>;

export interface BoardFilters {
  search: string;
  priority: string[];
  assignee: string[];
  recurrence: "all" | "normal" | "recurring";
  sortBy: "created" | "priority" | "dueDate" | "title" | "completed";
  sortDir: "asc" | "desc";
}

export const DEFAULT_FILTERS: BoardFilters = {
  search: "",
  priority: [],
  assignee: [],
  recurrence: "normal",
  sortBy: "completed",
  sortDir: "asc",
};

/** Recurring tasks board only shows recurring occurrences — never apply the "normal" recurrence filter. */
export const RECURRING_BOARD_DEFAULT_FILTERS: BoardFilters = {
  ...DEFAULT_FILTERS,
  recurrence: "all",
};

export interface TaskCardQuickActions {
  onEdit?: (task: Task) => void;
  onChangeStatus?: (task: Task, statusId: string) => void;
  onAssign?: (task: Task, assigneeId: string | null) => void;
  onDelete?: (task: Task) => void;
  onCompleteOccurrence?: (task: Task) => void;
  onSkipNextOccurrence?: (task: Task) => void;
  onPauseSeries?: (task: Task) => void;
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

function getColumnColor(status: WorkflowStatus, index: number) {
  const cat = getWorkflowStatusCategory(status);
  if (cat === "todo") return { dot: "bg-rose-500", ring: "ring-rose-500/20" };
  if (cat === "in_progress") return { dot: "bg-amber-500", ring: "ring-amber-500/20" };
  if (cat === "done") return { dot: "bg-emerald-500", ring: "ring-emerald-500/20" };
  return getStatusColor(index);
}

const COLUMN_SCROLL = "kanban-col-scroll";

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
  currentUserId,
  recurringBoardMode,
  recurringTemplate,
  recurringTemplateMap,
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
  currentUserId?: string | null;
  recurringBoardMode?: boolean;
  recurringTemplate?: RecurringTemplateSummary;
  recurringTemplateMap?: Record<string, RecurringTemplateSummary>;
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
      currentUserId={currentUserId}
      recurringBoardMode={recurringBoardMode}
      recurringTemplate={recurringTemplate}
      recurringTemplateMap={recurringTemplateMap}
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
  currentUserId?: string | null;
  recurringBoardMode?: boolean;
  recurringTemplateMap?: Record<string, RecurringTemplateSummary>;
}) {
  const canDrag =
    !props.isSelectionMode &&
    canUserMoveTask(
      props.task,
      props.currentUserId,
      !!props.permissions?.canMoveTask
    );
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
      <TaskCard
        {...props}
        recurringTemplate={
          props.recurringTemplateMap && props.task.recurringTemplateId
            ? props.recurringTemplateMap[props.task.recurringTemplateId]
            : undefined
        }
        recurringTemplateMap={props.recurringTemplateMap}
      />
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
        className="flex w-full items-center gap-1.5 rounded-md border border-dashed border-border/55 bg-background/50 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-all duration-200 hover:border-violet-300/45 hover:bg-violet-50/25 hover:text-violet-700 dark:hover:border-violet-500/25 dark:hover:bg-violet-500/5 dark:hover:text-violet-300"
      >
        <Plus className="h-3 w-3 shrink-0" />
        Add task
      </button>
    );
  }

  return (
    <div className="rounded-md border border-border/55 bg-card p-2 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
      <input
        ref={inputRef}
        type="text"
        placeholder="Task title…"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
          if (e.key === "Escape") { setEditing(false); setTitle(""); }
        }}
        onBlur={() => { if (!title.trim()) { setEditing(false); setTitle(""); } }}
        className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-[13px] placeholder:text-muted-foreground/50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
      />
      <div className="mt-1.5 flex items-center gap-1">
        <button
          type="button"
          onClick={handleSubmit}
          className="rounded-md bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground shadow-sm transition-all duration-200 hover:brightness-105"
        >
          Add task
        </button>
        <button
          type="button"
          onClick={() => { setEditing(false); setTitle(""); }}
          className="rounded-md px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors duration-200 hover:bg-muted/60"
        >
          Cancel
        </button>
        <span className="ml-auto text-[10px] text-muted-foreground/55">
          Enter to add
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

function ColumnSectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 px-0.5 pb-0.5 pt-1">
      <span className={APP_LABEL_UPPER}>{label}</span>
      <span className="text-[10px] font-medium tabular-nums text-muted-foreground/40">({count})</span>
      <div className="h-px flex-1 bg-border/40" />
    </div>
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
  currentUserId,
  boardVariant = "default",
  recurringTemplateMap,
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
  currentUserId?: string | null;
  boardVariant?: "default" | "recurring";
  recurringTemplateMap?: Record<string, RecurringTemplateSummary>;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: status.id,
    data: { statusId: status.id },
  });

  const colorSet = getColumnColor(status, statusIndex);
  const statusCategory = getWorkflowStatusCategory(status);
  const isActiveTarget = isOver || activeOverColumnId === status.id;
  const isOverWipLimit = wipLimit ? tasks.length > wipLimit : false;
  const isAtWipLimit = wipLimit ? tasks.length === wipLimit : false;
  const { recurring, oneTime } = partitionBoardTasks(tasks);
  const showSections =
    boardVariant !== "recurring" && recurring.length > 0 && oneTime.length > 0;
  const isRecurringBoard = boardVariant === "recurring";

  const columnHint = useMemo(() => {
    if (isRecurringBoard) return getRecurringColumnHint(status, tasks);
    const now = Date.now();
    if (statusCategory === "done") {
      return tasks.length > 0 ? `${tasks.length} completed` : null;
    }
    const overdue = tasks.filter(
      (t) => t.dueDate && new Date(t.dueDate).getTime() < now
    ).length;
    if (overdue > 0) return `${overdue} overdue`;
    if (statusCategory === "in_progress" && tasks.length > 0) {
      return `${tasks.length} active`;
    }
    return null;
  }, [tasks, statusCategory, status, isRecurringBoard]);

  const renderTaskCard = (task: Task) => (
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
      currentUserId={currentUserId}
      recurringBoardMode={isRecurringBoard}
      recurringTemplateMap={recurringTemplateMap}
    />
  );

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
        "group/col flex h-full min-h-0 min-w-[292px] flex-1 flex-col self-stretch rounded-lg border transition-all duration-200",
        "border-slate-200/65 bg-slate-50/30 shadow-[0_1px_3px_rgba(15,23,42,0.04)] dark:border-border/50 dark:bg-muted/8",
        isActiveTarget
          ? "border-violet-300/45 bg-violet-50/15 shadow-md shadow-violet-500/8 ring-1 ring-violet-400/20 dark:border-violet-500/25 dark:bg-violet-500/5"
          : "hover:border-slate-300/75 dark:hover:border-border/65",
        isOverWipLimit && !isActiveTarget && "border-red-500/25 bg-red-500/[0.02]"
      )}
      aria-label={`Column: ${status.name}`}
    >
      {/* Header — sticky inside column */}
      <div className="sticky top-0 z-10 shrink-0 border-b border-slate-200/50 bg-white/95 px-3 py-1.5 backdrop-blur-sm dark:border-border/40 dark:bg-card/95">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onToggleCollapse?.(status.id)}
            className="flex min-w-0 flex-1 items-center gap-1.5 transition-opacity duration-200 hover:opacity-75"
            aria-label={`Collapse ${status.name}`}
          >
            <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground/45" />
            <span className={cn("h-2 w-2 shrink-0 rounded-full", colorSet.dot)} />
            <div className="min-w-0 flex-1 text-left">
              <div className="flex items-center gap-1.5">
                <h3 className="truncate text-[13px] font-semibold leading-tight tracking-[-0.01em] text-foreground">
                  {status.name}
                </h3>
                <span
                  className={cn(
                    "app-chip shrink-0 border-transparent px-1.5 py-px text-[10px] font-semibold tabular-nums",
                    isOverWipLimit
                      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                      : isAtWipLimit
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        : "bg-muted/50 text-muted-foreground ring-1 ring-border/35"
                  )}
                >
                  {tasks.length}
                  {wipLimit ? `/${wipLimit}` : ""}
                </span>
              </div>
              {columnHint ? (
                <p className="mt-0.5 truncate text-[10px] font-medium text-muted-foreground/70">
                  {columnHint}
                </p>
              ) : null}
            </div>
          </button>

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

      {/* Cards — scrollable task list */}
      <div
        className={cn(
          "flex min-h-0 flex-1 basis-0 flex-col gap-1.5 overflow-y-auto overscroll-y-contain px-2 pb-1.5 pt-2",
          COLUMN_SCROLL
        )}
      >
        {recurring.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {showSections ? <ColumnSectionHeader label="Recurring" count={recurring.length} /> : null}
            {recurring.map(renderTaskCard)}
          </div>
        ) : null}
        {oneTime.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {showSections ? <ColumnSectionHeader label="Tasks" count={oneTime.length} /> : null}
            {oneTime.map(renderTaskCard)}
          </div>
        ) : null}

        {/* Empty */}
        {tasks.length === 0 && !isActiveTarget && (
          <div className="flex flex-1 items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/10 p-5">
            <div className="text-center">
              <Zap className="mx-auto mb-1 h-5 w-5 text-muted-foreground/20" />
              <p className="text-xs text-muted-foreground/50">
                {isRecurringBoard
                  ? getRecurringEmptyColumnMessage(status)
                  : "No tasks"}
              </p>
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
        <div className="shrink-0 border-t border-slate-200/50 px-2 pb-2.5 pt-2 dark:border-border/40">
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
  if (filters.recurrence === "normal") {
    result = result.filter((t) => !t.recurrenceType || t.recurrenceType === "NONE");
  } else if (filters.recurrence === "recurring") {
    result = result.filter((t) => !!t.recurrenceType && t.recurrenceType !== "NONE");
  }
  return result;
}

// ─── Board Stats ──────────────────────────────────────────────

export interface BoardStats {
  total: number;
  completed: number;
  overdue: number;
  completedPercent: number;
  inProgress: number;
  recurring: number;
  oneTime: number;
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
  const recurring = tasks.filter((t) => !!t.recurrenceType && t.recurrenceType !== "NONE").length;
  const oneTime = total - recurring;
  return { total, completed, overdue, completedPercent, inProgress, recurring, oneTime };
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
  currentUserId?: string | null;
  "aria-label"?: string;
  className?: string;
  boardVariant?: "default" | "recurring";
  recurringTemplateMap?: Record<string, RecurringTemplateSummary>;
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
  currentUserId,
  "aria-label": ariaLabel = "Kanban board",
  className,
  boardVariant = "default",
  recurringTemplateMap,
}: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);

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
    const effectiveFilters =
      boardVariant === "recurring" ? { ...filters, recurrence: "all" as const } : filters;
    for (const [statusId, tasks] of Object.entries(tasksByStatus)) {
      const filtered = applyFilters(tasks, effectiveFilters);
      result[statusId] = applyBoardSorting(filtered, effectiveFilters.sortBy, effectiveFilters.sortDir);
    }
    return result;
  }, [tasksByStatus, filters, boardVariant]);

  const handleDragStart = useCallback((e: DragStartEvent) => {
    setActiveId(e.active.id as string);
  }, []);

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
        className={cn("flex min-h-0 flex-1 flex-col", className)}
        role="region"
        aria-label={ariaLabel}
      >
        <div className="flex min-h-0 flex-1 items-stretch gap-4 overflow-x-auto overflow-y-hidden pb-3">
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
            currentUserId={currentUserId}
            boardVariant={boardVariant}
            recurringTemplateMap={recurringTemplateMap}
          />
        ))}
        </div>
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
