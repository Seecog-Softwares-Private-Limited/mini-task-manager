"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SubtaskAssigneeSelector } from "@/components/tasks/subtask-assignee-selector";
import { SubtaskDueDatePicker } from "@/components/tasks/subtask-due-date-picker";
import { SubtaskStatusSelector } from "@/components/tasks/subtask-status-selector";
import type { SubtaskStatus } from "@/lib/subtask-status";
import type { OrgMember } from "@/types/api";
import { getSubtaskAssigneeIds } from "@/lib/subtask-assignees";
import { UserAvatar } from "@/components/ui/user-avatar";

type MemberHint = { id: string; name: string; email?: string; avatarUrl?: string };

interface SubtaskCompactRowProps {
  title: string;
  completed: boolean;
  status?: SubtaskStatus | string;
  dueDate?: string;
  assigneeId?: string;
  assigneeIds?: string[];
  projectId: string;
  organizationId?: string;
  prefetchedOrgMembers?: OrgMember[];
  knownMembers?: MemberHint[];
  taskAssigneesOnly?: boolean;
  expanded?: boolean;
  /** Disables checkbox, status, and delete — row expand stays enabled. */
  editDisabled?: boolean;
  onToggleComplete: () => void;
  onStatusChange?: (status: SubtaskStatus) => void;
  onRowClick: () => void;
  onDelete: () => void;
  onAssigneeChange?: (assigneeIds: string[]) => void;
  onDueDateChange?: (dueDate?: string) => void;
}

export function SubtaskCompactRow({
  title,
  completed,
  status,
  dueDate,
  assigneeId,
  assigneeIds,
  projectId,
  organizationId,
  prefetchedOrgMembers,
  knownMembers,
  taskAssigneesOnly,
  expanded,
  editDisabled,
  onToggleComplete,
  onStatusChange,
  onRowClick,
  onDelete,
  onAssigneeChange,
  onDueDateChange,
}: SubtaskCompactRowProps) {
  const resolvedAssigneeIds = getSubtaskAssigneeIds({ assigneeId, assigneeIds });
  const assigneeMembers = resolvedAssigneeIds
    .map((id) => knownMembers?.find((m) => m.id === id) ?? { id, name: "User" })
    .filter(Boolean);

  return (
    <div
      className={cn(
        "group flex items-center gap-2 rounded-xl border border-border/50 bg-background/60 px-3 py-2.5 shadow-sm transition-all",
        expanded && "border-primary/30 bg-primary/[0.03] ring-1 ring-primary/15",
        completed && "opacity-75"
      )}
    >
      <input
        type="checkbox"
        checked={completed}
        disabled={editDisabled}
        onChange={(e) => {
          e.stopPropagation();
          onToggleComplete();
        }}
        onClick={(e) => e.stopPropagation()}
        className="h-4 w-4 shrink-0 rounded border-input accent-primary"
        aria-label={`Mark "${title}" complete`}
      />
      <button
        type="button"
        onClick={onRowClick}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-2 text-left",
          "rounded-md px-1 py-0.5 transition-colors hover:bg-muted/30"
        )}
      >
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-sm font-medium",
            completed && "text-muted-foreground line-through"
          )}
        >
          {title || "Untitled subtask"}
        </span>
      </button>
      <div
        className="flex shrink-0 items-center gap-1"
        onClick={(e) => e.stopPropagation()}
      >
        {onStatusChange ? (
          <SubtaskStatusSelector
            value={status}
            completed={completed}
            onChange={onStatusChange}
            disabled={editDisabled}
            variant="row"
          />
        ) : null}
        {onAssigneeChange ? (
          <SubtaskAssigneeSelector
            projectId={projectId}
            organizationId={organizationId}
            prefetchedOrgMembers={prefetchedOrgMembers}
            knownMembers={knownMembers}
            taskAssigneesOnly={taskAssigneesOnly}
            value={resolvedAssigneeIds}
            onChange={onAssigneeChange}
            disabled={editDisabled}
          />
        ) : (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center">
            {assigneeMembers.length === 1 ? (
              <UserAvatar
                userId={assigneeMembers[0].id}
                name={assigneeMembers[0].name}
                avatarUrl={assigneeMembers[0].avatarUrl}
                className="h-7 w-7 ring-1 ring-border/60"
                fallbackClassName="text-[10px]"
              />
            ) : assigneeMembers.length > 1 ? (
              <div className="flex -space-x-1.5">
                {assigneeMembers.slice(0, 2).map((member) => (
                  <UserAvatar
                    key={member.id}
                    userId={member.id}
                    name={member.name}
                    avatarUrl={member.avatarUrl}
                    className="h-5 w-5 border border-background ring-1 ring-border/50"
                    fallbackClassName="text-[8px]"
                  />
                ))}
              </div>
            ) : (
              <SubtaskAssigneeSelector
                projectId={projectId}
                organizationId={organizationId}
                prefetchedOrgMembers={prefetchedOrgMembers}
                knownMembers={knownMembers}
                taskAssigneesOnly={taskAssigneesOnly}
                value={[]}
                onChange={() => {}}
                disabled
              />
            )}
          </div>
        )}
        {onDueDateChange ? (
          <SubtaskDueDatePicker
            value={dueDate}
            completed={completed}
            onChange={onDueDateChange}
            disabled={editDisabled}
            variant="row"
          />
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground opacity-60 hover:text-destructive group-hover:opacity-100"
          disabled={editDisabled}
          onClick={onDelete}
          aria-label="Remove subtask"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
