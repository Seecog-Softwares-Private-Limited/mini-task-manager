"use client";

import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchOrgMembers, fetchProjectMembers } from "@/services/api/members.api";
import { useTenant } from "@/context/tenant-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/ui/user-avatar";
import { SubtaskAssigneeSelector } from "@/components/tasks/subtask-assignee-selector";
import {
  processSubtaskComposerPaste,
  SubtaskComposerAttachments,
  SubtaskRowAttachmentPreview,
} from "@/components/tasks/create-task/subtask-composer-attachments";
import type {
  FieldErrors,
  UseFieldArrayPrepend,
  UseFieldArrayRemove,
  UseFormRegister,
  UseFormSetValue,
} from "react-hook-form";
import { CalendarDays, Check, Pencil, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { generateClientId } from "@/lib/generate-client-id";
import {
  resolveSubtaskStatus,
  subtaskWithCompleted,
  type SubtaskStatus,
} from "@/lib/subtask-status";
import type { PendingSubtaskAttachment } from "@/components/tasks/subtasks/subtask-attachments-section";
import { useToast } from "@/components/ui/use-toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export interface SubtaskItem {
  id?: string;
  title: string;
  completed: boolean;
  description?: string;
  assigneeId?: string;
  dueDate?: string;
  status?: SubtaskStatus;
}

interface SubtasksEditorProps {
  projectId: string;
  fields: Array<{ id: string } & SubtaskItem>;
  values?: SubtaskItem[];
  register?: UseFormRegister<any>;
  prepend: UseFieldArrayPrepend<any, any>;
  remove: UseFieldArrayRemove;
  setValue: UseFormSetValue<any>;
  errors: FieldErrors<any>;
  disabled?: boolean;
  pendingAttachmentsBySubtask?: Record<string, PendingSubtaskAttachment[]>;
  onPendingAttachmentsChange?: (
    subtaskKey: string,
    items: PendingSubtaskAttachment[]
  ) => void;
  hideQuickAdd?: boolean;
}

function formatCompactDueDate(value?: string): string {
  if (!value) return "";
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return "";
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function SubtasksEditor({
  projectId,
  fields,
  values,
  prepend,
  remove,
  setValue,
  errors,
  disabled,
  pendingAttachmentsBySubtask = {},
  onPendingAttachmentsChange,
  hideQuickAdd,
}: SubtasksEditorProps) {
  const { orgId } = useTenant();
  const { toast } = useToast();
  const titleInputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);

  const [composerOpen, setComposerOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draftKey, setDraftKey] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftAssigneeId, setDraftAssigneeId] = useState<string | undefined>();
  const [draftDueDate, setDraftDueDate] = useState("");
  const [pasteFlash, setPasteFlash] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<{
    index: number;
    key: string;
  } | null>(null);

  const subtaskErrors =
    (errors.subtasks as Array<{ title?: { message?: string } } | undefined> | undefined) ?? [];

  const { data: projectMembers = [] } = useQuery({
    queryKey: ["project-members", projectId],
    queryFn: () => fetchProjectMembers(projectId),
    enabled: !!projectId,
    staleTime: 60_000,
  });

  const { data: orgMembers = [] } = useQuery({
    queryKey: ["org-members", orgId ?? ""],
    queryFn: () => fetchOrgMembers(orgId!),
    enabled: !!orgId,
    staleTime: 60_000,
  });

  const memberById = useMemo(() => {
    const map = new Map<string, { name: string; avatarUrl?: string }>();
    for (const m of projectMembers) {
      map.set(m.userId, {
        name: m.user?.fullName ?? m.user?.email ?? "User",
        avatarUrl: m.user?.avatarUrl,
      });
    }
    for (const om of orgMembers) {
      if (om.status?.toLowerCase() !== "active" || map.has(om.userId)) continue;
      map.set(om.userId, {
        name: om.user?.fullName ?? om.user?.email ?? "User",
        avatarUrl: om.user?.avatarUrl,
      });
    }
    return map;
  }, [projectMembers, orgMembers]);

  const progress = useMemo(() => {
    const list = values ?? [];
    const total = list.filter((s) => s.title.trim().length > 0).length;
    const completed = list.filter(
      (s) => s.title.trim().length > 0 && resolveSubtaskStatus(s) === "DONE"
    ).length;
    return { completed, total };
  }, [values]);

  const savedEntries = useMemo(
    () =>
      fields
        .map((field, index) => ({
          field,
          index,
          value: values?.[index],
          key: values?.[index]?.id ?? field.id,
        }))
        .filter(({ value }) => (value?.title ?? "").trim().length > 0),
    [fields, values]
  );

  const draftAttachments = draftKey
    ? pendingAttachmentsBySubtask[draftKey] ?? []
    : [];

  function clearDraftAttachments(key: string) {
    const items = pendingAttachmentsBySubtask[key] ?? [];
    for (const item of items) {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    }
    onPendingAttachmentsChange?.(key, []);
  }

  function openCreateComposer() {
    const key = generateClientId();
    setDraftKey(key);
    setEditingIndex(null);
    setDraftTitle("");
    setDraftDescription("");
    setDraftAssigneeId(undefined);
    setDraftDueDate("");
    setComposerOpen(true);
    requestAnimationFrame(() => titleInputRef.current?.focus());
  }

  function openEditComposer(index: number) {
    const value = values?.[index];
    const key = value?.id ?? fields[index]?.id ?? generateClientId();
    setDraftKey(key);
    setEditingIndex(index);
    setDraftTitle(value?.title ?? "");
    setDraftDescription(value?.description ?? "");
    setDraftAssigneeId(value?.assigneeId);
    setDraftDueDate(value?.dueDate ?? "");
    setComposerOpen(true);
    requestAnimationFrame(() => titleInputRef.current?.focus());
  }

  function closeComposer() {
    if (editingIndex === null && draftKey) {
      clearDraftAttachments(draftKey);
    }
    setComposerOpen(false);
    setEditingIndex(null);
    setDraftKey("");
    setDraftTitle("");
    setDraftDescription("");
    setDraftAssigneeId(undefined);
    setDraftDueDate("");
    setPasteFlash(false);
  }

  function handleSaveSubtask() {
    const title = draftTitle.trim();
    const description = draftDescription.trim();
    if (!title || disabled) return;

    if (editingIndex !== null) {
      setValue(`subtasks.${editingIndex}.title`, title, { shouldDirty: true, shouldTouch: true });
      setValue(`subtasks.${editingIndex}.description`, description ? description : undefined, {
        shouldDirty: true,
        shouldTouch: true,
      });
      setValue(`subtasks.${editingIndex}.assigneeId`, draftAssigneeId, {
        shouldDirty: true,
        shouldTouch: true,
      });
      setValue(`subtasks.${editingIndex}.dueDate`, draftDueDate || undefined, {
        shouldDirty: true,
        shouldTouch: true,
      });
      if (!values?.[editingIndex]?.id) {
        setValue(`subtasks.${editingIndex}.id`, draftKey, { shouldDirty: true });
      }
    } else {
      prepend({
        id: draftKey,
        title,
        completed: false,
        description: description ? description : undefined,
        assigneeId: draftAssigneeId,
        dueDate: draftDueDate || undefined,
        status: "TODO",
      });
    }

    setComposerOpen(false);
    setEditingIndex(null);
    setDraftKey("");
    setDraftTitle("");
    setDraftDescription("");
    setDraftAssigneeId(undefined);
    setDraftDueDate("");
  }

  function handleRemoveSubtask(index: number, key: string) {
    if (composerOpen && editingIndex === index) closeComposer();
    clearDraftAttachments(key);
    remove(index);
  }

  function toggleComplete(index: number) {
    const current = values?.[index];
    if (!current) return;
    const completed = resolveSubtaskStatus(current) === "DONE";
    const next = subtaskWithCompleted(current, !completed);
    setValue(`subtasks.${index}.status`, next.status, { shouldDirty: true, shouldTouch: true });
    setValue(`subtasks.${index}.completed`, next.completed, {
      shouldDirty: true,
      shouldTouch: true,
    });
  }

  const canSaveDraft = draftTitle.trim().length > 0 && !disabled;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-[11px] font-medium text-muted-foreground">
          Subtasks{" "}
          <span className="font-normal text-muted-foreground/75">
            — {progress.completed} of {progress.total} completed
          </span>
        </p>
        {!composerOpen && !hideQuickAdd ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 shrink-0 rounded-md px-2 text-[11px] transition-all duration-200"
            onClick={openCreateComposer}
            disabled={disabled}
          >
            <Plus className="mr-1 h-3 w-3" /> Add subtask
          </Button>
        ) : null}
      </div>

      {composerOpen ? (
        <div
          ref={composerRef}
          className="rounded-lg border border-violet-500/20 bg-muted/10 p-2.5 shadow-sm transition-all duration-200"
          onPaste={(event) => {
            if (!onPendingAttachmentsChange || !draftKey) return;
            processSubtaskComposerPaste(event, draftAttachments, (items) =>
              onPendingAttachmentsChange(draftKey, items), {
              disabled,
              onError: (message) =>
                toast({ title: "Could not paste image", description: message, variant: "error" }),
              onSuccess: () => {
                setPasteFlash(true);
                window.setTimeout(() => setPasteFlash(false), 2000);
              },
            });
          }}
        >
          <Input
            ref={titleInputRef}
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            placeholder="Subtask title"
            disabled={disabled}
            className="h-8 rounded-md border-border/55 bg-background text-sm shadow-sm transition-all duration-200 focus-visible:ring-violet-500/15"
            onKeyDown={(e) => {
              if (e.key === "Enter" && canSaveDraft) {
                e.preventDefault();
                handleSaveSubtask();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                closeComposer();
              }
            }}
          />
          <Input
            value={draftDescription}
            onChange={(e) => setDraftDescription(e.target.value)}
            placeholder="Subtask description (optional)"
            disabled={disabled}
            className="mt-2 h-8 rounded-md border-border/55 bg-background text-sm shadow-sm transition-all duration-200 focus-visible:ring-violet-500/15"
            aria-label="Subtask description"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">Assignee</span>
              <SubtaskAssigneeSelector
                projectId={projectId}
                value={draftAssigneeId}
                onChange={setDraftAssigneeId}
                disabled={disabled}
              />
            </div>
            <div className="flex min-w-[120px] flex-1 items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" aria-hidden />
              <Input
                type="date"
                value={draftDueDate}
                onChange={(e) => setDraftDueDate(e.target.value)}
                disabled={disabled}
                className="h-8 flex-1 rounded-md border-border/55 bg-background px-2 text-xs shadow-sm transition-all duration-200"
                aria-label="Subtask due date"
              />
            </div>
          </div>

          {onPendingAttachmentsChange && draftKey ? (
            <SubtaskComposerAttachments
              attachments={draftAttachments}
              onChange={(items) => onPendingAttachmentsChange(draftKey, items)}
              disabled={disabled}
              pasteFlash={pasteFlash}
            />
          ) : null}

          <div className="mt-2 flex justify-end gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11px] transition-colors duration-200"
              onClick={closeComposer}
              disabled={disabled}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-7 gap-1 px-2.5 text-[11px] transition-all duration-200"
              onClick={handleSaveSubtask}
              disabled={!canSaveDraft}
            >
              {editingIndex !== null ? (
                <>
                  <Check className="h-3 w-3" /> Save
                </>
              ) : (
                "Add"
              )}
            </Button>
          </div>
        </div>
      ) : null}

      {savedEntries.length > 0 ? (
        <ul className="space-y-1">
          {savedEntries.map(({ field, index, value, key }) => {
            const message = subtaskErrors[index]?.title?.message ?? "";
            const assignee = value?.assigneeId ? memberById.get(value.assigneeId) : undefined;
            const dueLabel = formatCompactDueDate(value?.dueDate);
            const completed = resolveSubtaskStatus(value ?? { completed: false }) === "DONE";
            const rowAttachments = pendingAttachmentsBySubtask[key] ?? [];
            const isEditingThis = composerOpen && editingIndex === index;

            return (
              <li key={field.id}>
                <div
                  className={cn(
                    "group flex items-center gap-1.5 rounded-md border border-border/45 bg-background/80 px-1.5 py-1 transition-all duration-200 hover:border-border/70 hover:bg-muted/20",
                    isEditingThis && "border-violet-500/25 bg-violet-500/[0.04]",
                    completed && "opacity-75"
                  )}
                >
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => toggleComplete(index)}
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all duration-200",
                      completed
                        ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-600"
                        : "border-border/60 bg-background hover:border-violet-500/40"
                    )}
                    aria-label={completed ? "Mark subtask incomplete" : "Mark subtask complete"}
                  >
                    {completed ? <Check className="h-2.5 w-2.5" /> : null}
                  </button>

                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate text-[13px] text-foreground",
                      completed && "text-muted-foreground line-through"
                    )}
                  >
                    {value?.title}
                  </span>

                  {assignee ? (
                    <UserAvatar
                      userId={value!.assigneeId!}
                      name={assignee.name}
                      avatarUrl={assignee.avatarUrl}
                      className="h-5 w-5 shrink-0"
                      fallbackClassName="text-[8px]"
                    />
                  ) : null}

                  {dueLabel ? (
                    <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                      {dueLabel}
                    </span>
                  ) : null}

                  <SubtaskRowAttachmentPreview attachments={rowAttachments} />

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 text-muted-foreground opacity-70 transition-all duration-200 hover:text-foreground group-hover:opacity-100"
                    onClick={() => openEditComposer(index)}
                    disabled={disabled || (composerOpen && editingIndex !== index)}
                    aria-label={`Edit subtask ${value?.title}`}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 text-muted-foreground opacity-70 transition-all duration-200 hover:text-destructive group-hover:opacity-100"
                    onClick={() =>
                      setRemoveTarget({
                        index,
                        key,
                      })
                    }
                    disabled={disabled}
                    aria-label={`Remove subtask ${value?.title}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                {message ? <p className="mt-0.5 text-[11px] text-destructive">{message}</p> : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      <ConfirmDialog
        open={removeTarget !== null}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        title="Remove subtask"
        description="This will remove the subtask from the checklist."
        confirmLabel="Remove"
        variant="destructive"
        icon="delete"
        elevated
        onConfirm={() => {
          if (removeTarget) {
            handleRemoveSubtask(removeTarget.index, removeTarget.key);
          }
        }}
      />
    </div>
  );
}
