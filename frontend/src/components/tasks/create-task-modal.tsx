"use client";

import { useEffect, useRef, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { WorkflowStatus } from "@/types/api";
import { cn } from "@/lib/utils";
import { AssigneeSelector } from "@/components/tasks/create-task/assignee-selector";
import {
  LabelsMultiSelect,
  type TaskLabelDraft,
} from "@/components/tasks/create-task/labels-multi-select";
import {
  SubtasksEditor,
  type SubtaskItem,
} from "@/components/tasks/create-task/subtasks-editor";
import { TaskAttachmentsSection } from "@/components/tasks/task-attachments-section";
import type { PendingSubtaskAttachment } from "@/components/tasks/subtasks/subtask-attachments-section";
import { DueDateField } from "@/components/tasks/create-task/due-date-field";
import {
  TaskDescriptionField,
  type TaskDescriptionFieldHandle,
} from "@/components/tasks/task-description-field";
import { useToast } from "@/components/ui/use-toast";
import {
  X, ArrowRight, Flag, AlignLeft,
  Layers, AlertCircle, Download,
} from "lucide-react";
import { RecurrenceEditor } from "@/components/tasks/recurrence/recurrence-editor";
import type { TaskRecurrenceConfig } from "@/types/api";
import { recurrenceSummary } from "@/lib/recurrence-display";

const PRIORITIES = [
  { value: "LOW", label: "Low", color: "bg-emerald-500", ring: "ring-emerald-500/30" },
  { value: "MEDIUM", label: "Medium", color: "bg-amber-500", ring: "ring-amber-500/30" },
  { value: "HIGH", label: "High", color: "bg-red-500", ring: "ring-red-500/30" },
  { value: "CRITICAL", label: "Critical", color: "bg-purple-500", ring: "ring-purple-500/30" },
];

const schema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  description: z.string().max(5000).optional(),
  priority: z.string().default("MEDIUM"),
  statusId: z.string().optional(),
  assigneeIds: z.array(z.string().uuid()).default([]),
  storyPoints: z.coerce.number().min(0).max(100).optional(),
  dueDate: z
    .string()
    .optional()
    .refine((value) => !value || !Number.isNaN(Date.parse(value)), {
      message: "Due date must be a valid date",
    }),
  labels: z
    .array(
      z.object({
        name: z.string().trim().min(1, "Label name is required").max(24),
        color: z.string().trim().min(4).max(16),
      })
    )
    .default([]),
  subtasks: z
    .array(
      z.object({
        id: z.string().optional(),
        title: z.string().trim().min(1, "Subtask title is required").max(200),
        description: z.string().max(10000).optional(),
        completed: z.boolean().default(false),
        assigneeId: z.string().uuid().optional(),
        priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
        dueDate: z
          .string()
          .optional()
          .refine((value) => !value || !Number.isNaN(Date.parse(value)), {
            message: "Subtask due date must be valid",
          }),
      })
    )
    .default([]),
  recurrence: z.custom<TaskRecurrenceConfig>().optional(),
});

export type CreateTaskFormData = z.infer<typeof schema>;

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (
    data: CreateTaskFormData,
    descriptionImageFiles?: File[],
    subtaskPendingAttachments?: Record<string, PendingSubtaskAttachment[]>,
    taskPendingAttachments?: PendingSubtaskAttachment[]
  ) => void;
  isSubmitting: boolean;
  error?: string | null;
  projectId: string;
  statuses: WorkflowStatus[];
  defaultStatusId?: string;
  /** Export current project tasks as a shareable CSV file. */
  onExportCsv?: () => void;
  exportCsvDisabled?: boolean;
}

export function CreateTaskModal({
  open,
  onClose,
  onSubmit,
  isSubmitting,
  error,
  projectId,
  statuses,
  defaultStatusId,
  onExportCsv,
  exportCsvDisabled = false,
}: CreateTaskModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const descriptionFieldRef = useRef<TaskDescriptionFieldHandle>(null);
  const { toast } = useToast();
  const [pendingSubtaskAttachments, setPendingSubtaskAttachments] = useState<
    Record<string, PendingSubtaskAttachment[]>
  >({});
  const [pendingTaskAttachments, setPendingTaskAttachments] = useState<PendingSubtaskAttachment[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<CreateTaskFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      priority: "MEDIUM",
      statusId: defaultStatusId || statuses[0]?.id || "",
      assigneeIds: [],
      storyPoints: undefined,
      dueDate: "",
      labels: [],
      subtasks: [],
      recurrence: { repeat: "NONE" },
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "subtasks",
  });

  const selectedPriority = watch("priority");
  const selectedStatusId = watch("statusId");
  const watchedSubtasks = watch("subtasks");
  const watchedRecurrence = watch("recurrence");

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (open) {
      reset({
        title: "",
        description: "",
        priority: "MEDIUM",
        statusId: defaultStatusId || statuses[0]?.id || "",
        assigneeIds: [],
        storyPoints: undefined,
        dueDate: "",
        labels: [],
        subtasks: [],
        recurrence: { repeat: "NONE" },
      });
      descriptionFieldRef.current?.resetPendingImages();
      setPendingSubtaskAttachments({});
      setPendingTaskAttachments([]);
    }
  }, [open, defaultStatusId, statuses, reset]);

  function handleFormSubmit(data: CreateTaskFormData) {
    if (data.recurrence?.repeat && data.recurrence.repeat !== "NONE" && !data.dueDate) {
      toast({
        title: "Due date required for recurring task",
        description: "Set a due date so the recurring series can generate occurrences accurately.",
        variant: "error",
      });
      return;
    }
    const imageFiles = descriptionFieldRef.current?.getPendingImageFiles() ?? [];
    const hasSubtaskFiles = Object.values(pendingSubtaskAttachments).some((list) => list.length > 0);
    onSubmit(
      data,
      imageFiles.length ? imageFiles : undefined,
      hasSubtaskFiles ? pendingSubtaskAttachments : undefined,
      pendingTaskAttachments.length ? pendingTaskAttachments : undefined
    );
  }

  const statusColors = ["bg-blue-500", "bg-amber-500", "bg-purple-500", "bg-emerald-500", "bg-red-500"];

  return (
    <Sheet
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <SheetContent
        side="right"
        showClose={false}
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
        data-cy="create-task-modal"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          closeRef.current?.focus();
        }}
      >
        {/* Header */}
        <SheetHeader className="shrink-0 space-y-1 border-b px-6 py-5 text-left">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <SheetTitle id="create-task-title" className="text-xl font-semibold">
                Create Task
              </SheetTitle>
              <SheetDescription className="mt-1">
                Add a new task to your project board.
              </SheetDescription>
            </div>
            <Button
              ref={closeRef}
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-full"
              onClick={onClose}
              type="button"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        {/* Form */}
        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="task-title" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Task Title *
              </Label>
              <Input
                id="task-title"
                placeholder="e.g. Implement user authentication"
                data-cy="task-title-input"
                {...register("title")}
                autoFocus
                className="text-base font-medium"
              />
              {errors.title && (
                <p className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3" /> {errors.title.message}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="task-desc" className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <AlignLeft className="h-3 w-3" /> Description
              </Label>
              <Controller
                control={control}
                name="description"
                render={({ field }) => (
                  <TaskDescriptionField
                    ref={descriptionFieldRef}
                    id="task-desc"
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    disabled={isSubmitting}
                    data-cy="task-desc-input"
                    onPasteError={(message) =>
                      toast({
                        title: "Could not paste image",
                        description: message,
                        variant: "error",
                      })
                    }
                  />
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Flag className="h-3 w-3" /> Priority
                </Label>
                <div className="flex flex-wrap gap-2">
                  {PRIORITIES.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setValue("priority", p.value)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-all duration-200",
                        selectedPriority === p.value
                          ? `border-transparent ring-2 ${p.ring} bg-card shadow-sm`
                          : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                      )}
                    >
                      <span className={cn("h-2.5 w-2.5 rounded-full", p.color)} />
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {statuses.length > 0 ? (
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Layers className="h-3 w-3" /> Status
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {statuses.map((s, i) => {
                      const colorClass = statusColors[i % statusColors.length];
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setValue("statusId", s.id)}
                          className={cn(
                            "flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-all duration-200",
                            selectedStatusId === s.id
                              ? "border-primary/30 bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                              : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                          )}
                        >
                          <span className={cn("h-2.5 w-2.5 rounded-full", colorClass)} />
                          {s.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-border/70 bg-muted/20 p-3 text-xs text-muted-foreground">
                  No statuses configured for this project.
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Assignee
                </Label>
                <Controller
                  control={control}
                  name="assigneeIds"
                  render={({ field }) => (
                    <AssigneeSelector
                      projectId={projectId}
                      value={field.value ?? []}
                      onChange={field.onChange}
                      disabled={isSubmitting}
                    />
                  )}
                />
              </div>

              <Controller
                control={control}
                name="dueDate"
                render={({ field }) => (
                  <DueDateField
                    value={field.value}
                    onChange={field.onChange}
                    disabled={isSubmitting}
                    hint={
                      watchedRecurrence?.repeat && watchedRecurrence.repeat !== "NONE"
                        ? "First occurrence due date — the series repeats from this anchor."
                        : undefined
                    }
                  />
                )}
              />
            </div>

            <Controller
              control={control}
              name="labels"
              render={({ field }) => (
                <LabelsMultiSelect
                  value={(field.value ?? []) as TaskLabelDraft[]}
                  onChange={field.onChange}
                  disabled={isSubmitting}
                />
              )}
            />

            <TaskAttachmentsSection
              persist={false}
              pendingAttachments={pendingTaskAttachments}
              onPendingChange={setPendingTaskAttachments}
              disabled={isSubmitting}
            />

            <SubtasksEditor
              projectId={projectId}
              fields={fields as Array<{ id: string } & SubtaskItem>}
              values={watchedSubtasks}
              register={register}
              setValue={setValue}
              append={append}
              remove={remove}
              errors={errors}
              disabled={isSubmitting}
              pendingAttachmentsBySubtask={pendingSubtaskAttachments}
              onPendingAttachmentsChange={(subtaskKey, items) =>
                setPendingSubtaskAttachments((prev) => ({ ...prev, [subtaskKey]: items }))
              }
            />

            <Controller
              control={control}
              name="recurrence"
              render={({ field }) => (
                <RecurrenceEditor
                  value={field.value}
                  onChange={field.onChange}
                  disabled={isSubmitting}
                />
              )}
            />
            {watchedRecurrence?.repeat && watchedRecurrence.repeat !== "NONE" ? (
              <p className="rounded-xl bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                {recurrenceSummary(watchedRecurrence) ?? "Recurring schedule enabled"}
              </p>
            ) : null}

            {errors.dueDate && (
              <p className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3 w-3" /> {errors.dueDate.message}
              </p>
            )}

            {error && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3">
                <p className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" /> {error}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t bg-muted/20 px-6 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-[11px] text-muted-foreground">
                Press <kbd className="rounded border bg-background px-1 py-0.5 text-[10px] font-mono">Ctrl+Enter</kbd> to submit
              </p>
              {onExportCsv ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  disabled={exportCsvDisabled || isSubmitting}
                  onClick={onExportCsv}
                >
                  <Download className="h-3.5 w-3.5" />
                  Export tasks as ZIP
                </Button>
              ) : null}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} type="button">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                data-cy="task-create-submit"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Creating...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Create Task <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
