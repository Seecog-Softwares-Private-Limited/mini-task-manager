"use client";

import dynamic from "next/dynamic";
import {
  type Control,
  type FieldErrors,
  type UseFormHandleSubmit,
  type UseFormRegister,
  type UseFormSetValue,
  Controller,
} from "react-hook-form";
import { ArrowRight, Globe, Lock, Pencil, Plus } from "lucide-react";
import type { Organization, Project } from "@/types/api";
import type { CreateProjectFormData } from "@/lib/project-form-schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { isRateLimited, parseApiError } from "@/services/api/client";
import { WorkspaceThumb } from "@/components/workspaces/workspace-thumb";
import { ProjectFormPreview } from "@/components/projects/project-form-preview";

const ProjectFormDescriptionEditor = dynamic(
  () =>
    import("@/components/projects/project-form-description-editor").then(
      (mod) => mod.ProjectFormDescriptionEditor
    ),
  { ssr: false, loading: () => <Skeleton className="h-[148px] w-full rounded-lg" /> }
);

const ProjectIconPicker = dynamic(
  () => import("@/components/projects/project-icon-picker").then((mod) => mod.ProjectIconPicker),
  { ssr: false, loading: () => <Skeleton className="h-28 w-full rounded-lg" /> }
);

const VISIBILITY_OPTIONS = [
  { value: "PRIVATE", label: "Private", hint: "Only invited members", icon: Lock },
  { value: "PUBLIC", label: "Workspace", hint: "Visible to workspace", icon: Globe },
] as const;

export interface ProjectCreateEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingProject: Project | null;
  workspaces: Organization[];
  register: UseFormRegister<CreateProjectFormData>;
  control: Control<CreateProjectFormData>;
  errors: FieldErrors<CreateProjectFormData>;
  setValue: UseFormSetValue<CreateProjectFormData>;
  handleSubmit: UseFormHandleSubmit<CreateProjectFormData>;
  onSubmit: (values: CreateProjectFormData) => void;
  selectedWorkspaceId: string;
  projectName: string;
  description: string;
  visibility: string;
  projectIconUrl: string | null;
  onProjectIconChange: (url: string | null) => void;
  formBusy: boolean;
  canSubmit: boolean;
  createError: unknown;
  updateError: unknown;
  onCancel: () => void;
}

function FormFieldLabel({
  htmlFor,
  children,
  optional,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <Label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {children}
      </Label>
      {optional && (
        <span className="text-xs font-normal text-muted-foreground">Optional</span>
      )}
    </div>
  );
}

export function ProjectCreateEditModal({
  open,
  onOpenChange,
  editingProject,
  workspaces,
  register,
  control,
  errors,
  setValue,
  handleSubmit,
  onSubmit,
  selectedWorkspaceId,
  projectName,
  description,
  visibility,
  projectIconUrl,
  onProjectIconChange,
  formBusy,
  canSubmit,
  createError,
  updateError,
  onCancel,
}: ProjectCreateEditModalProps) {
  const isEdit = !!editingProject;
  const statusLabel = isEdit
    ? editingProject.isArchived
      ? "Archived"
      : "Active"
    : "Active";
  const nameLength = projectName?.length ?? 0;
  const nameTrimmed = projectName?.trim() ?? "";
  const nameLooksGood = nameTrimmed.length > 0 && !errors.name;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="bg-black/35 backdrop-blur-[2px]"
        className="flex max-h-[min(88vh,760px)] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
        data-cy={isEdit ? "edit-project-form" : "create-project-form"}
      >
        <DialogHeader className="shrink-0 space-y-1 border-b border-border/50 px-6 pb-3 pt-5 pr-14">
          <DialogTitle className="flex items-center gap-2 text-left text-lg font-semibold tracking-tight">
            {isEdit ? (
              <Pencil className="h-4.5 w-4.5 shrink-0 text-sky-600 dark:text-sky-400" />
            ) : (
              <Plus className="h-4.5 w-4.5 shrink-0 text-primary" />
            )}
            {isEdit ? "Edit project" : "Create Project"}
          </DialogTitle>
          <DialogDescription className="text-left text-[13px] leading-snug text-muted-foreground">
            {isEdit
              ? "Update name, description, visibility, and icon. Workspace cannot be moved here."
              : "Create a project to organize tasks, members, milestones, and progress inside a workspace."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-6 py-4">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_min(228px,32%)] lg:items-start">
              <div className="space-y-4">
                <section className="space-y-3">
                  <div className="space-y-1.5">
                    <FormFieldLabel htmlFor="project-workspace">Workspace</FormFieldLabel>
                    <Select
                      value={selectedWorkspaceId || undefined}
                      onValueChange={(v) =>
                        setValue("workspaceId", v, { shouldValidate: true })
                      }
                      disabled={workspaces.length === 0 || isEdit}
                    >
                      <SelectTrigger
                        id="project-workspace"
                        className="h-10 transition-colors duration-200"
                        aria-label="Workspace for project"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden pr-1 text-left">
                          <SelectValue
                            placeholder="Select workspace"
                            className="min-w-0 flex-1 truncate data-[placeholder]:truncate"
                          />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {workspaces.map((w: Organization) => (
                          <SelectItem
                            key={w.id}
                            value={w.id}
                            textValue={`${w.name}${w.isArchived ? " (archived)" : ""}`}
                          >
                            <span className="flex min-w-0 w-full items-center gap-2">
                              <WorkspaceThumb workspace={w} size="sm" className="shrink-0" />
                              <span className="min-w-0 flex-1 truncate font-medium">{w.name}</span>
                              {w.isArchived && (
                                <span className="shrink-0 text-xs text-muted-foreground">
                                  (archived)
                                </span>
                              )}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.workspaceId && (
                      <p className="text-xs text-destructive">{errors.workspaceId.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <FormFieldLabel htmlFor="name">Project Name</FormFieldLabel>
                    <Input
                      id="name"
                      {...register("name")}
                      placeholder="e.g. Software Development"
                      className="h-10 transition-colors duration-200"
                      data-cy="project-name-input"
                      maxLength={200}
                    />
                    <div className="flex min-h-[16px] items-center justify-between gap-2">
                      {errors.name ? (
                        <p className="text-xs text-destructive">{errors.name.message}</p>
                      ) : nameLooksGood ? (
                        <p className="text-xs text-emerald-600/85 dark:text-emerald-400/85">
                          Looks good
                        </p>
                      ) : (
                        <span className="text-xs text-muted-foreground/70">
                          Required
                        </span>
                      )}
                      <p className="shrink-0 tabular-nums text-[11px] text-muted-foreground/70">
                        {nameLength}/200
                      </p>
                    </div>
                  </div>
                </section>

                <section className="space-y-1.5">
                  <FormFieldLabel optional>Description</FormFieldLabel>
                  <Controller
                    name="description"
                    control={control}
                    render={({ field }) => (
                      <ProjectFormDescriptionEditor
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        placeholder="Track features, bugs, and sprints"
                        disabled={formBusy}
                        compact
                      />
                    )}
                  />
                  {errors.description && (
                    <p className="text-xs text-destructive">{errors.description.message}</p>
                  )}
                </section>

                <section className="space-y-1.5">
                  <FormFieldLabel>Visibility</FormFieldLabel>
                  <div className="grid grid-cols-2 gap-1.5">
                    {VISIBILITY_OPTIONS.map(({ value, label, hint, icon: Icon }) => {
                      const selected = (visibility || "PRIVATE") === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          disabled={formBusy}
                          onClick={() =>
                            setValue("visibility", value, { shouldValidate: true })
                          }
                          className={cn(
                            "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-all duration-200",
                            selected
                              ? "border-violet-400/55 bg-violet-50/45 shadow-[0_0_0_1px_rgba(139,92,246,0.1)] dark:border-violet-500/35 dark:bg-violet-500/10"
                              : "border-border/50 bg-card hover:border-border/80 hover:bg-muted/25"
                          )}
                          aria-pressed={selected}
                        >
                          <Icon
                            className={cn(
                              "h-3.5 w-3.5 shrink-0",
                              selected ? "text-violet-600 dark:text-violet-400" : "text-muted-foreground"
                            )}
                          />
                          <span className="min-w-0">
                            <span className="block text-[13px] font-medium leading-tight text-foreground">
                              {label}
                            </span>
                            <span className="mt-0.5 block text-[10px] leading-tight text-muted-foreground">
                              {hint}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="space-y-1.5">
                  <FormFieldLabel optional>Project Icon</FormFieldLabel>
                  <ProjectIconPicker
                    value={projectIconUrl}
                    onChange={onProjectIconChange}
                    projectNamePlaceholder={projectName?.trim() || "Project"}
                    disabled={formBusy}
                  />
                </section>
              </div>

              <aside className="order-first lg:order-none lg:sticky lg:top-0">
                <ProjectFormPreview
                  name={projectName}
                  description={description}
                  iconUrl={projectIconUrl}
                  visibility={visibility || "PRIVATE"}
                  statusLabel={statusLabel}
                  taskCount={0}
                />
              </aside>
            </div>

            {!!createError && !isEdit && (
              <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3">
                <p className="text-sm text-destructive">
                  {isRateLimited(createError)
                    ? "Too many requests. Try again later."
                    : parseApiError(createError)}
                </p>
              </div>
            )}
            {!!updateError && isEdit && (
              <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3">
                <p className="text-sm text-destructive">
                  {isRateLimited(updateError)
                    ? "Too many requests. Try again later."
                    : parseApiError(updateError)}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="relative z-10 shrink-0 gap-2 border-t border-border/50 bg-card px-6 py-3.5 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="transition-colors duration-200"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={formBusy || !canSubmit}
              className="min-w-[140px] transition-all duration-200"
              data-cy={isEdit ? "project-edit-submit" : "project-create-submit"}
            >
              {formBusy ? (
                isEdit ? "Saving…" : "Creating…"
              ) : isEdit ? (
                "Save changes"
              ) : (
                <span className="flex items-center gap-2">
                  Create Project
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
