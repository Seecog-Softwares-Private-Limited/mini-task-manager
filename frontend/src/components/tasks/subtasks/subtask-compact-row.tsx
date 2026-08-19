"use client";

import { CalendarDays, Check, MessageSquare, MoreHorizontal, Trash2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  resolveSubtaskStatus,
  type SubtaskStatus,
} from "@/lib/subtask-status";
import { getSubtaskRowClassName, getSubtaskRowStyle } from "@/lib/subtask-row-style";
import type { OrgMember } from "@/types/api";
import { getSubtaskAssigneeIds } from "@/lib/subtask-assignees";
import { normalizeAssigneeUserId } from "@/lib/task-assignees";
import { UserAvatar } from "@/components/ui/user-avatar";
import { SubtaskStatusSelector } from "@/components/tasks/subtask-status-selector";

/** Above sheet/drawer overlay (z-50). */
const DROPDOWN_Z = "z-[110]";

type MemberHint = { id: string; name: string; email?: string; avatarUrl?: string };

interface SubtaskCompactRowProps {
  title: string;
  completed: boolean;
  status?: SubtaskStatus | string;
  dueDate?: string;
  dueTime?: string;
  assigneeId?: string;
  assigneeIds?: string[];
  /** Denormalized notes preview from threaded checklist comments. */
  note?: string | null;
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
  onDueDateChange?: (dueDate?: string, dueTime?: string) => void;
  /** Opens threaded checklist comments (planner notes). */
  onNotesClick?: () => void;
}

function dueDateInputValue(value?: string): string {
  if (!value) return "";
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
}

function dueTimeInputValue(value?: string): string {
  if (!value) return "";
  const match = String(value).match(/^([01]\d|2[0-3]):[0-5]\d/);
  return match ? match[0] : "";
}

function formatDueDateLabel(value?: string, dueTime?: string): string {
  if (!value) return "Due date";
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(value);
  if (Number.isNaN(date.getTime())) return "Due date";
  const datePart = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const timeRaw = dueTimeInputValue(dueTime);
  if (!timeRaw) return datePart;
  const [hRaw, mRaw] = timeRaw.split(":");
  const hours = Number(hRaw);
  const minutes = Number(mRaw);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return datePart;
  const timeDate = new Date();
  timeDate.setHours(hours, minutes, 0, 0);
  const timePart = timeDate.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${datePart} · ${timePart}`;
}

export function SubtaskCompactRow({
  title,
  completed,
  status,
  dueDate,
  dueTime,
  assigneeId,
  assigneeIds,
  note,
  knownMembers,
  expanded,
  editDisabled,
  onToggleComplete,
  onStatusChange,
  onRowClick,
  onDelete,
  onAssigneeChange,
  onDueDateChange,
  onNotesClick,
}: SubtaskCompactRowProps) {
  const resolvedAssigneeIds = getSubtaskAssigneeIds({ assigneeId, assigneeIds });
  const hasNote = Boolean(note?.trim());
  const resolvedStatus = resolveSubtaskStatus({ status, completed });

  const assigneeMembers = resolvedAssigneeIds
    .map((id) => knownMembers?.find((m) => m.id === id) ?? { id, name: "User" })
    .filter(Boolean);

  const assignableMembers = [...(knownMembers ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const rowInput = { status, completed, dueDate, dueTime, expanded };
  const timeValue = dueTimeInputValue(dueTime);

  function toggleAssignee(memberId: string) {
    if (!onAssigneeChange || editDisabled) return;
    const isSelected = resolvedAssigneeIds.some(
      (id) => normalizeAssigneeUserId(id) === normalizeAssigneeUserId(memberId)
    );
    if (isSelected) {
      onAssigneeChange(
        resolvedAssigneeIds.filter(
          (id) => normalizeAssigneeUserId(id) !== normalizeAssigneeUserId(memberId)
        )
      );
      return;
    }
    onAssigneeChange([...resolvedAssigneeIds, memberId]);
  }

  return (
    <div
      className={cn(
        "group flex items-center gap-2.5 rounded-lg border px-3 py-2",
        getSubtaskRowClassName(rowInput)
      )}
      style={getSubtaskRowStyle(rowInput)}
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
        className="h-3.5 w-3.5 shrink-0 rounded-[4px] border-input/80 accent-primary"
        aria-label={`Mark "${title}" complete`}
      />
      <button
        type="button"
        onClick={onRowClick}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-2 text-left",
          "rounded-md px-0.5 py-0.5 transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
        )}
      >
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-[13px] font-medium tracking-tight text-foreground/90",
            completed && "text-muted-foreground/80 line-through decoration-muted-foreground/40"
          )}
        >
          {title || "Untitled subtask"}
        </span>
      </button>
      <div
        className="flex shrink-0 items-center gap-1.5"
        onClick={(e) => e.stopPropagation()}
      >
        {onStatusChange ? (
          <SubtaskStatusSelector
            value={resolvedStatus}
            completed={completed}
            onChange={onStatusChange}
            disabled={editDisabled}
            variant="row"
          />
        ) : null}
        {assigneeMembers.length === 1 ? (
          <UserAvatar
            userId={assigneeMembers[0].id}
            name={assigneeMembers[0].name}
            avatarUrl={assigneeMembers[0].avatarUrl}
            className="h-6 w-6 ring-1 ring-border/60"
            fallbackClassName="text-[9px]"
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
        ) : null}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground opacity-70 hover:text-foreground group-hover:opacity-100 data-[state=open]:opacity-100 data-[state=open]:text-foreground"
              aria-label="Subtask options"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className={cn("min-w-[11.5rem] p-1", DROPDOWN_Z)}
            sideOffset={6}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {onNotesClick ? (
              <DropdownMenuItem
                onSelect={() => onNotesClick()}
                className={cn(hasNote && "text-primary")}
              >
                <MessageSquare className="mr-2 h-3.5 w-3.5" />
                {hasNote ? "Notes" : "Add note"}
              </DropdownMenuItem>
            ) : null}

            {onAssigneeChange ? (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger disabled={editDisabled} className="gap-2">
                  <UserRound className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate">Assignees</span>
                  {resolvedAssigneeIds.length > 0 ? (
                    <span className="text-xs text-muted-foreground">
                      {resolvedAssigneeIds.length}
                    </span>
                  ) : null}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className={cn("w-64 p-1", DROPDOWN_Z)}>
                  {assignableMembers.length === 0 ? (
                    <div className="px-2 py-3 text-center text-xs text-muted-foreground">
                      Assign members to the task first
                    </div>
                  ) : (
                    assignableMembers.map((member) => {
                      const checked = resolvedAssigneeIds.some(
                        (id) =>
                          normalizeAssigneeUserId(id) ===
                          normalizeAssigneeUserId(member.id)
                      );
                      return (
                        <DropdownMenuItem
                          key={member.id}
                          disabled={editDisabled}
                          onSelect={(event) => {
                            event.preventDefault();
                            toggleAssignee(member.id);
                          }}
                          className="rounded-md py-2"
                        >
                          <div className="flex w-full items-center gap-2.5">
                            <UserAvatar
                              userId={member.id}
                              name={member.name}
                              avatarUrl={member.avatarUrl}
                              className="h-6 w-6"
                              fallbackClassName="text-[9px]"
                            />
                            <span className="min-w-0 flex-1 truncate text-xs font-medium">
                              {member.name}
                            </span>
                            <span
                              className={cn(
                                "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                                checked
                                  ? "border-primary bg-primary text-white"
                                  : "border-border bg-background text-transparent"
                              )}
                              aria-hidden
                            >
                              <Check className="h-3 w-3" />
                            </span>
                          </div>
                        </DropdownMenuItem>
                      );
                    })
                  )}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            ) : null}

            {onDueDateChange ? (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger disabled={editDisabled} className="gap-2">
                  <CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate">
                    {formatDueDateLabel(dueDate, dueTime)}
                  </span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent
                  className={cn("w-64 p-3", DROPDOWN_Z)}
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <DropdownMenuLabel className="px-0 pt-0 text-xs font-semibold">
                    Due date & time
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="space-y-3 pt-2">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-muted-foreground">
                        Date
                      </label>
                      <Input
                        type="date"
                        disabled={editDisabled}
                        value={dueDateInputValue(dueDate)}
                        onChange={(e) => {
                          const nextDate = e.target.value || undefined;
                          onDueDateChange(
                            nextDate,
                            nextDate ? timeValue || undefined : undefined
                          );
                        }}
                        className="h-9 text-xs"
                      />
                    </div>
                    {dueDate ? (
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-muted-foreground">
                          Time <span className="font-normal">(optional)</span>
                        </label>
                        <Input
                          type="time"
                          disabled={editDisabled}
                          value={timeValue}
                          onChange={(e) =>
                            onDueDateChange(dueDate, e.target.value || undefined)
                          }
                          className="h-9 text-xs"
                        />
                      </div>
                    ) : null}
                    {dueDate ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8 w-full text-xs"
                        disabled={editDisabled}
                        onClick={() => onDueDateChange(undefined, undefined)}
                      >
                        Clear due date
                      </Button>
                    ) : null}
                  </div>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            ) : null}

            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={editDisabled}
              onSelect={() => onDelete()}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
