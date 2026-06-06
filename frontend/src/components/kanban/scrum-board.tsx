"use client";

import { useCallback, useMemo, useState } from "react";
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
import type { Sprint } from "@/types/api";
import {
  ChevronDown,
  ChevronRight,
  Inbox,
  Rocket,
  Zap,
} from "lucide-react";
import type { BoardPermissions } from "@/hooks/use-board-permissions";
import { canUserMoveTask } from "@/lib/task-assignees";
import type { AssigneeMap, BoardFilters, SubtaskInfo, TaskCardQuickActions } from "./kanban-board";
import { TaskCard } from "./task-card";

const BACKLOG_ID = "__backlog__";

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

function cellId(swimlaneId: string, statusId: string) {
  return `${swimlaneId}::${statusId}`;
}

function parseCellId(id: string): { swimlaneId: string; statusId: string } | null {
  const parts = id.split("::");
  if (parts.length !== 2) return null;
  return { swimlaneId: parts[0], statusId: parts[1] };
}

// ─── Filter & Sort (reused from kanban) ────────────────────────

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

const PRIORITY_CONFIG: Record<string, { order: number }> = {
  CRITICAL: { order: 0 },
  HIGH: { order: 1 },
  MEDIUM: { order: 2 },
  LOW: { order: 3 },
};

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

// ─── Swimlane type ─────────────────────────────────────────────

export interface Swimlane {
  id: string;
  name: string;
  sprint?: Sprint;
  isBacklog: boolean;
}

// ─── Draggable Card ─────────────────────────────────────────────

function ScrumDraggableCard(props: {
  task: Task;
  swimlaneId: string;
  statusId: string;
  boardColumnStatus?: WorkflowStatus;
  onTaskClick?: (task: Task) => void;
  assigneeMap?: AssigneeMap;
  commentCount?: number;
  subtaskInfo?: SubtaskInfo;
  statuses?: WorkflowStatus[];
  quickActions?: TaskCardQuickActions;
  isMoving?: boolean;
  isSelected?: boolean;
  isSelectionMode?: boolean;
  onToggleSelect?: (taskId: string) => void;
  permissions?: BoardPermissions;
  currentUserId?: string | null;
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
    data: {
      task: props.task,
      statusId: props.statusId,
      swimlaneId: props.swimlaneId,
    },
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
        task={props.task}
        onTaskClick={props.onTaskClick}
        assigneeMap={props.assigneeMap}
        commentCount={props.commentCount}
        subtaskInfo={props.subtaskInfo}
        statuses={props.statuses}
        boardColumnStatus={props.boardColumnStatus}
        quickActions={props.quickActions}
        isMoving={props.isMoving}
        isSelected={props.isSelected}
        isSelectionMode={props.isSelectionMode}
        onToggleSelect={props.onToggleSelect}
        permissions={props.permissions}
        currentUserId={props.currentUserId}
      />
    </div>
  );
}

// ─── Droppable Cell ─────────────────────────────────────────────

function ScrumCell({
  swimlaneId,
  status,
  statusIndex,
  tasks,
  onTaskClick,
  assigneeMap,
  commentCountMap,
  subtaskMap,
  allStatuses,
  quickActions,
  isActiveTarget,
  wipLimit,
  movingTaskId,
  isSelectionMode,
  selectedIds,
  onToggleSelect,
  permissions,
  currentUserId,
}: {
  swimlaneId: string;
  status: WorkflowStatus;
  statusIndex: number;
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  assigneeMap?: AssigneeMap;
  commentCountMap?: Record<string, number>;
  subtaskMap?: Record<string, SubtaskInfo>;
  allStatuses?: WorkflowStatus[];
  quickActions?: TaskCardQuickActions;
  isActiveTarget?: boolean;
  wipLimit?: number;
  movingTaskId?: string | null;
  isSelectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (taskId: string) => void;
  permissions?: BoardPermissions;
  currentUserId?: string | null;
}) {
  const droppableId = cellId(swimlaneId, status.id);
  const { setNodeRef, isOver } = useDroppable({ id: droppableId });
  const active = isOver || isActiveTarget;
  const isOverWipLimit = wipLimit ? tasks.length > wipLimit : false;
  const isAtWipLimit = wipLimit ? tasks.length === wipLimit : false;
  const colorSet = getStatusColor(statusIndex);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[120px] w-[280px] shrink-0 flex-col rounded-xl border transition-all duration-200",
        active
          ? "ring-2 ring-primary/40 border-primary/30 bg-primary/[0.03]"
          : "bg-muted/10 border-muted/30",
        isOverWipLimit && !active && "border-red-500/30 bg-red-500/[0.02]"
      )}
    >
      <div className="flex items-center justify-between px-2 py-1.5 border-b">
        <span className={cn("h-2 w-2 rounded-full", colorSet.dot)} />
        <span
          className={cn(
            "text-[10px] font-semibold tabular-nums",
            isOverWipLimit ? "text-red-600" : isAtWipLimit ? "text-amber-600" : "text-muted-foreground"
          )}
        >
          {tasks.length}
          {wipLimit ? `/${wipLimit}` : ""}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2 scrollbar-thin">
        {tasks.map((task) => (
          <ScrumDraggableCard
            key={task.id}
            task={task}
            swimlaneId={swimlaneId}
            statusId={status.id}
            boardColumnStatus={status}
            onTaskClick={onTaskClick}
            assigneeMap={assigneeMap}
            commentCount={commentCountMap?.[task.id]}
            subtaskInfo={subtaskMap?.[task.id]}
            statuses={allStatuses}
            quickActions={quickActions}
            isMoving={movingTaskId === task.id}
            isSelected={selectedIds?.has(task.id)}
            isSelectionMode={isSelectionMode}
            onToggleSelect={onToggleSelect}
            permissions={permissions}
            currentUserId={currentUserId}
          />
        ))}
        {tasks.length === 0 && !active && (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-muted-foreground/10 py-4">
            <Zap className="h-4 w-4 text-muted-foreground/20" />
          </div>
        )}
        {active && (
          <div className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 py-3 text-center">
            <p className="text-[10px] font-medium text-primary/60">Drop here</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Props ─────────────────────────────────────────────────────

export interface ScrumBoardProps {
  swimlanes: Swimlane[];
  statuses: WorkflowStatus[];
  tasksByCell: Record<string, Task[]>;
  onMoveTask: (taskId: string, toStatusId: string, toSprintId: string | null) => void;
  onQuickAdd?: (title: string, statusId: string, sprintId: string | null) => void;
  onTaskClick?: (task: Task) => void;
  assigneeMap?: AssigneeMap;
  commentCountMap?: Record<string, number>;
  subtaskMap?: Record<string, SubtaskInfo>;
  filters?: BoardFilters;
  quickActions?: TaskCardQuickActions;
  wipLimits?: Record<string, number>;
  movingTaskId?: string | null;
  collapsedSwimlanes?: Record<string, boolean>;
  onToggleSwimlaneCollapse?: (swimlaneId: string) => void;
  isSelectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (taskId: string) => void;
  permissions?: BoardPermissions;
  currentUserId?: string | null;
  "aria-label"?: string;
  className?: string;
}

// ─── Main Board ────────────────────────────────────────────────

export function ScrumBoard({
  swimlanes,
  statuses,
  tasksByCell,
  onMoveTask,
  onQuickAdd,
  onTaskClick,
  assigneeMap,
  commentCountMap,
  subtaskMap,
  filters = { search: "", priority: [], assignee: [], sortBy: "created", sortDir: "desc" },
  quickActions,
  wipLimits,
  movingTaskId,
  collapsedSwimlanes,
  onToggleSwimlaneCollapse,
  isSelectionMode,
  selectedIds,
  onToggleSelect,
  permissions,
  currentUserId,
  "aria-label": ariaLabel = "Scrum board",
  className,
}: ScrumBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overCellId, setOverCellId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const activeTask = useMemo(() => {
    if (!activeId) return null;
    for (const tasks of Object.values(tasksByCell)) {
      const t = tasks.find((x) => x.id === activeId);
      if (t) return t;
    }
    return null;
  }, [activeId, tasksByCell]);

  const overlayBoardColumnStatus = useMemo(() => {
    if (!activeId) return undefined;
    for (const [key, taskList] of Object.entries(tasksByCell)) {
      if (!taskList.some((t) => t.id === activeId)) continue;
      const parsed = parseCellId(key);
      if (!parsed) continue;
      return statuses.find((s) => s.id === parsed.statusId);
    }
    return undefined;
  }, [activeId, tasksByCell, statuses]);

  const handleDragStart = useCallback((e: DragStartEvent) => {
    setActiveId(e.active.id as string);
  }, []);

  const handleDragOver = useCallback((e: DragOverEvent) => {
    const overId = e.over?.id as string | undefined;
    if (overId && parseCellId(overId)) {
      setOverCellId(overId);
    } else {
      setOverCellId(null);
    }
  }, []);

  const handleDragEnd = useCallback(
    (e: DragEndEvent) => {
      setActiveId(null);
      setOverCellId(null);
      const { active, over } = e;
      if (!over) return;
      const parsed = parseCellId(over.id as string);
      if (!parsed) return;
      const taskId = active.id as string;
      const data = active.data.current as { task: Task; statusId: string; swimlaneId: string } | undefined;
      const fromStatusId = data?.statusId;
      const fromSwimlaneId = data?.swimlaneId;
      const toStatusId = parsed.statusId;
      const toSprintId = parsed.swimlaneId === BACKLOG_ID ? null : parsed.swimlaneId;
      if (toStatusId !== fromStatusId || toSprintId !== (fromSwimlaneId === BACKLOG_ID ? null : fromSwimlaneId)) {
        onMoveTask(taskId, toStatusId, toSprintId);
      }
    },
    [onMoveTask]
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setOverCellId(null);
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
        className={cn("overflow-x-auto overflow-y-auto", className)}
        role="region"
        aria-label={ariaLabel}
      >
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 w-[180px] min-w-[180px] border-b border-r bg-muted/30 px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
                Swimlane
              </th>
              {statuses.map((s, idx) => (
                <th
                  key={s.id}
                  className="min-w-[280px] border-b bg-muted/30 px-2 py-2 text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2.5 w-2.5 rounded-full", getStatusColor(idx).dot)} />
                    <span className="text-xs font-semibold">{s.name}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {swimlanes.map((swimlane) => {
              const collapsed = collapsedSwimlanes?.[swimlane.id];
              return (
                <tr key={swimlane.id} className="border-b border-muted/30">
                  <td className="sticky left-0 z-10 border-r bg-background/95 backdrop-blur px-3 py-2">
                    <button
                      type="button"
                      onClick={() => onToggleSwimlaneCollapse?.(swimlane.id)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-muted/50 transition-colors"
                    >
                      {collapsed ? (
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      {swimlane.isBacklog ? (
                        <Inbox className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <Rocket className="h-4 w-4 text-primary shrink-0" />
                      )}
                      <span className="text-sm font-medium truncate">{swimlane.name}</span>
                    </button>
                  </td>
                  {collapsed ? (
                    <td colSpan={statuses.length} className="bg-muted/5 px-2 py-2">
                      <p className="text-xs text-muted-foreground">Click to expand</p>
                    </td>
                  ) : (
                    statuses.map((status, statusIdx) => {
                      const cellKey = cellId(swimlane.id, status.id);
                      const tasks = tasksByCell[cellKey] ?? [];
                      const filtered = applyFilters(tasks, filters);
                      const sorted = applySorting(filtered, filters.sortBy, filters.sortDir);
                      return (
                        <td key={cellKey} className="align-top p-2">
                          <ScrumCell
                            swimlaneId={swimlane.id}
                            status={status}
                            statusIndex={statusIdx}
                            tasks={sorted}
                            onTaskClick={onTaskClick}
                            assigneeMap={assigneeMap}
                            commentCountMap={commentCountMap}
                            subtaskMap={subtaskMap}
                            allStatuses={statuses}
                            quickActions={quickActions}
                            isActiveTarget={overCellId === cellKey}
                            wipLimit={wipLimits?.[status.id]}
                            movingTaskId={movingTaskId}
                            isSelectionMode={isSelectionMode}
                            selectedIds={selectedIds}
                            onToggleSelect={onToggleSelect}
                            permissions={permissions}
                            currentUserId={currentUserId}
                          />
                        </td>
                      );
                    })
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <DragOverlay dropAnimation={{ duration: 250, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
        {activeTask ? (
          <div className="w-[280px]">
            <TaskCard
              task={activeTask}
              isOverlay
              assigneeMap={assigneeMap}
              commentCount={commentCountMap?.[activeTask.id]}
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
