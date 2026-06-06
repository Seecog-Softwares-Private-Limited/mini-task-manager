"use client";

import { Paperclip, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SubtaskAssigneeSelector } from "@/components/tasks/subtask-assignee-selector";
import type { OrgMember } from "@/types/api";

const PRIORITY_LABELS: Record<string, { label: string; dot: string }> = {
  LOW: { label: "Low", dot: "bg-emerald-500" },
  MEDIUM: { label: "Medium", dot: "bg-amber-500" },
  HIGH: { label: "High", dot: "bg-red-500" },
  CRITICAL: { label: "Critical", dot: "bg-purple-500" },
};

function formatCompactDueDate(value?: string): string {
  if (!value) return "";
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return "";
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(date.getTime())) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = date.toLocaleDateString(undefined, { month: "short" });
  return `Due ${day} ${month}`;
}

type MemberHint = { id: string; name: string; email?: string; avatarUrl?: string };

interface SubtaskCompactRowProps {
  title: string;
  completed: boolean;
  priority?: string;
  dueDate?: string;
  assigneeId?: string;
  attachmentCount: number;
  projectId: string;
  organizationId?: string;
  prefetchedOrgMembers?: OrgMember[];
  knownMembers?: MemberHint[];
  expanded?: boolean;
  /** Disables checkbox and delete — row expand stays enabled. */
  editDisabled?: boolean;
  onToggleComplete: () => void;
  onRowClick: () => void;
  onDelete: () => void;
  onAssigneeChange?: (assigneeId?: string) => void;
}

export function SubtaskCompactRow({
  title,
  completed,
  priority = "MEDIUM",
  dueDate,
  assigneeId,
  attachmentCount,
  projectId,
  organizationId,
  prefetchedOrgMembers,
  knownMembers,
  expanded,
  editDisabled,
  onToggleComplete,
  onRowClick,
  onDelete,
  onAssigneeChange,
}: SubtaskCompactRowProps) {
  const priorityMeta = PRIORITY_LABELS[priority] ?? PRIORITY_LABELS.MEDIUM;
  const dueLabel = formatCompactDueDate(dueDate);

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
        <span className="hidden shrink-0 items-center gap-1.5 sm:inline-flex">
          <span className="inline-flex items-center gap-1 rounded-full bg-muted/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground/80 ring-1 ring-border/30">
            <span className={cn("h-1.5 w-1.5 rounded-full", priorityMeta.dot)} />
            {priorityMeta.label}
          </span>
          {dueLabel ? (
            <span className="text-[11px] font-medium text-muted-foreground">{dueLabel}</span>
          ) : null}
        </span>
      </button>
      <div
        className="flex shrink-0 items-center gap-1"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {onAssigneeChange ? (
          <SubtaskAssigneeSelector
            projectId={projectId}
            organizationId={organizationId}
            prefetchedOrgMembers={prefetchedOrgMembers}
            knownMembers={knownMembers}
            value={assigneeId}
            onChange={onAssigneeChange}
            disabled={editDisabled}
          />
        ) : (
          <SubtaskAssigneeSelector
            projectId={projectId}
            organizationId={organizationId}
            prefetchedOrgMembers={prefetchedOrgMembers}
            knownMembers={knownMembers}
            value={assigneeId}
            onChange={() => {}}
            disabled
          />
        )}
        {attachmentCount > 0 ? (
          <span
            className="inline-flex items-center gap-0.5 rounded-full bg-muted/40 px-2 py-1 text-[11px] font-medium text-muted-foreground"
            title={`${attachmentCount} attachment${attachmentCount === 1 ? "" : "s"}`}
          >
            <Paperclip className="h-3 w-3" />
            {attachmentCount}
          </span>
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
