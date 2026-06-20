"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { groupTasksForAgenda } from "@/lib/planner-agenda-utils";
import { EXEC_PLANNER } from "@/lib/executive-planner-theme";
import { PlannerEntryCard } from "@/components/recurring/planner-entry-card";
import type { AssigneeMap, SubtaskInfo } from "@/components/kanban/kanban-board";
import type { Task, RecurringTemplateSummary, WorkflowStatus } from "@/types/api";
import { CalendarDays, CheckCircle2, Clock, Flame, ListTodo } from "lucide-react";

const GROUP_ICONS = {
  missed: Flame,
  today: Clock,
  tomorrow: CalendarDays,
  this_week: ListTodo,
  completed: CheckCircle2,
} as const;

interface RecurringAgendaViewProps {
  tasks: Task[];
  statuses: WorkflowStatus[];
  overdueTaskIds: string[];
  recurringTemplateMap?: Record<string, RecurringTemplateSummary>;
  assigneeMap?: AssigneeMap;
  subtaskMap?: Record<string, SubtaskInfo>;
  commentCountMap?: Record<string, number>;
  doneStatusId?: string;
  readOnly?: boolean;
  onTaskClick?: (task: Task) => void;
  onMarkDone?: (task: Task) => void;
  onSkip?: (task: Task) => void;
  onSnooze?: (task: Task) => void;
  className?: string;
}

export function RecurringAgendaView({
  tasks,
  statuses,
  overdueTaskIds,
  recurringTemplateMap,
  assigneeMap,
  subtaskMap,
  commentCountMap,
  doneStatusId,
  readOnly,
  onTaskClick,
  onMarkDone,
  onSkip,
  onSnooze,
  className,
}: RecurringAgendaViewProps) {
  const groups = useMemo(
    () => groupTasksForAgenda(tasks, statuses, overdueTaskIds, doneStatusId),
    [tasks, statuses, overdueTaskIds, doneStatusId]
  );

  if (groups.length === 0) {
    return (
      <div
        className={cn(
          EXEC_PLANNER.paperCard,
          "flex flex-1 flex-col items-center justify-center px-6 py-16 text-center",
          className
        )}
      >
        <CalendarDays className="h-8 w-8 text-muted-foreground/40" />
        <p className="mt-3 text-sm font-semibold">Your agenda is clear</p>
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
          No recurring occurrences match your filters. Try another view or create a new planner series.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        EXEC_PLANNER.paperCard,
        "flex min-h-0 flex-1 flex-col overflow-hidden",
        className
      )}
    >
      <div className="shrink-0 border-b border-border/40 px-4 py-3">
        <p className={EXEC_PLANNER.sectionLabel}>Agenda</p>
        <h2 className="text-sm font-semibold tracking-tight">Your planner entries</h2>
        <p className="text-[11px] text-muted-foreground">
          Grouped by urgency · {tasks.length} {tasks.length === 1 ? "entry" : "entries"}
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-3 sm:p-4">
        {groups.map((group) => {
          const Icon = GROUP_ICONS[group.key];
          return (
            <section key={group.key} aria-label={group.label}>
              <div className="mb-2 flex items-center gap-2 px-1">
                <div
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-lg",
                    group.key === "missed"
                      ? "bg-rose-500/10 text-rose-600"
                      : group.key === "today"
                        ? "bg-sky-500/10 text-sky-600"
                        : group.key === "completed"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-muted/50 text-muted-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold">{group.label}</h3>
                  <p className="text-[10px] text-muted-foreground">{group.hint}</p>
                </div>
                <span className="ml-auto rounded-full bg-muted/50 px-2 py-0.5 text-[10px] tabular-nums text-muted-foreground">
                  {group.tasks.length}
                </span>
              </div>
              <div className="space-y-2">
                {group.tasks.map((task) => (
                  <PlannerEntryCard
                    key={task.id}
                    task={task}
                    template={
                      task.recurringTemplateId
                        ? recurringTemplateMap?.[task.recurringTemplateId]
                        : undefined
                    }
                    statuses={statuses}
                    overdueTaskIds={overdueTaskIds}
                    assigneeMap={assigneeMap}
                    subtaskInfo={subtaskMap?.[task.id]}
                    commentCount={commentCountMap?.[task.id]}
                    readOnly={readOnly}
                    onOpen={onTaskClick}
                    onMarkDone={onMarkDone}
                    onSkip={onSkip}
                    onSnooze={onSnooze}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
