"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { DueDateField } from "@/components/tasks/create-task/due-date-field";
import {
  TaskDescriptionField,
  type TaskDescriptionFieldHandle,
} from "@/components/tasks/task-description-field";
import { useToast } from "@/components/ui/use-toast";
import {
  X, Sparkles, ArrowRight, Flag, AlignLeft,
  Layers, AlertCircle,
} from "lucide-react";

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
        title: z.string().trim().min(1, "Subtask title is required").max(200),
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
});

export type CreateTaskFormData = z.infer<typeof schema>;

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTaskFormData, descriptionImageFiles?: File[]) => void;
  isSubmitting: boolean;
  error?: string | null;
  projectId: string;
  statuses: WorkflowStatus[];
  defaultStatusId?: string;
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
}: CreateTaskModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const descriptionFieldRef = useRef<TaskDescriptionFieldHandle>(null);
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "subtasks",
  });

  const selectedPriority = watch("priority");
  const selectedStatusId = watch("statusId");
  const watchedSubtasks = watch("subtasks");

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

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
      });
      descriptionFieldRef.current?.resetPendingImages();
    }
  }, [open, defaultStatusId, statuses, reset]);

  if (!open || !mounted) return null;

  function handleFormSubmit(data: CreateTaskFormData) {
    const imageFiles = descriptionFieldRef.current?.getPendingImageFiles() ?? [];
    onSubmit(data, imageFiles.length ? imageFiles : undefined);
  }

  const statusColors = ["bg-blue-500", "bg-amber-500", "bg-purple-500", "bg-emerald-500", "bg-red-500"];

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-task-title"
      data-cy="create-task-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="my-auto w-full max-w-xl rounded-2xl border bg-card shadow-premium-lg animate-scale-in overflow-hidden max-h-[min(90vh,calc(100dvh-2rem))] flex flex-col">
        {/* Header */}
        <div className="gradient-bg p-5 text-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
                <Sparkles className="h-4 w-4" />
              </div>
              <h2 id="create-task-title" className="text-lg font-bold">
                Create Task
              </h2>
            </div>
            <Button
              ref={closeRef}
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
              onClick={onClose}
              type="button"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-1.5 text-sm text-white/60">Add a new task to your project board.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex-1 overflow-y-auto p-5 space-y-5">
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
          />

          {errors.dueDate && (
            <p className="flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="h-3 w-3" /> {errors.dueDate.message}
            </p>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3">
              <p className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" /> {error}
              </p>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="border-t p-4 flex items-center justify-between gap-3 shrink-0 bg-muted/20">
          <p className="text-[11px] text-muted-foreground">
            Press <kbd className="rounded border bg-background px-1 py-0.5 text-[10px] font-mono">Ctrl+Enter</kbd> to submit
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit(handleFormSubmit)}
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
      </div>
    </div>,
    document.body,
  );
}
