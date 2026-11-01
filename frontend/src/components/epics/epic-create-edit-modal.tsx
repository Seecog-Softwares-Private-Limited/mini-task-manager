"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchProjects } from "@/services/api/projects.api";
import { cn } from "@/lib/utils";
import { EPIC_COLORS } from "@/lib/epic-badges";
import type { CreateEpicPayload } from "@/services/api/epics.api";
import type { Epic, EpicStatus } from "@/types/api";

const STATUSES: EpicStatus[] = ["TODO", "IN_PROGRESS", "DONE"];
const STATUS_LABEL: Record<EpicStatus, string> = {
  TODO: "Not started",
  IN_PROGRESS: "In progress",
  DONE: "Done",
};

export interface EpicFormPayload {
  projectId: string;
  title: string;
  description?: string;
  color?: string;
  status?: EpicStatus;
  startDate?: string;
  dueDate?: string;
}

export interface EpicCreateEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  epic?: Epic | null;
  defaultProjectId?: string;
  onSubmit: (payload: EpicFormPayload) => void | Promise<void>;
  isSubmitting?: boolean;
  error?: string | null;
}

export function EpicCreateEditModal({
  open,
  onOpenChange,
  epic,
  defaultProjectId,
  onSubmit,
  isSubmitting = false,
  error,
}: EpicCreateEditModalProps) {
  const isEdit = !!epic;
  const [projectId, setProjectId] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [color, setColor] = React.useState(EPIC_COLORS[0].value);
  const [status, setStatus] = React.useState<EpicStatus>("TODO");
  const [startDate, setStartDate] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
    enabled: open && !isEdit,
  });

  React.useEffect(() => {
    if (!open) return;
    setProjectId(epic?.projectId ?? defaultProjectId ?? "");
    setTitle(epic?.title ?? "");
    setDescription(epic?.description ?? "");
    setColor(epic?.color ?? EPIC_COLORS[0].value);
    setStatus(epic?.status ?? "TODO");
    setStartDate(epic?.startDate ?? "");
    setDueDate(epic?.dueDate ?? "");
  }, [open, epic, defaultProjectId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle || !projectId) return;
    onSubmit({
      projectId,
      title: trimmedTitle,
      description: description.trim() || undefined,
      color,
      status,
      startDate: startDate || undefined,
      dueDate: dueDate || undefined,
    });
  };

  const canSubmit = !!title.trim() && !!projectId && !isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[480px]"
        aria-labelledby="epic-modal-title"
        aria-describedby="epic-modal-desc"
      >
        <DialogHeader>
          <DialogTitle id="epic-modal-title">{isEdit ? "Edit epic" : "New epic"}</DialogTitle>
          <DialogDescription id="epic-modal-desc">
            A grouping above sprints and tasks — powers the roadmap and backlog swimlanes.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isEdit && (
            <div>
              <Label htmlFor="epic-project">Project</Label>
              <Select value={projectId} onValueChange={setProjectId} disabled={isSubmitting || projectsLoading}>
                <SelectTrigger id="epic-project" className="mt-1.5" aria-required="true">
                  <SelectValue placeholder={projectsLoading ? "Loading projects…" : "Select a project"} />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label htmlFor="epic-title">Title</Label>
            <Input
              id="epic-title"
              placeholder="Checkout Redesign"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1.5"
              required
              autoFocus
              disabled={isSubmitting}
              maxLength={300}
              aria-required="true"
            />
          </div>
          <div>
            <Label htmlFor="epic-description">Description</Label>
            <Textarea
              id="epic-description"
              placeholder="Optional"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1.5 min-h-[80px]"
              disabled={isSubmitting}
              maxLength={10000}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="epic-start">Start date</Label>
              <Input
                id="epic-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1.5"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <Label htmlFor="epic-due">Due date</Label>
              <Input
                id="epic-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1.5"
                disabled={isSubmitting}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="epic-status">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as EpicStatus)} disabled={isSubmitting}>
              <SelectTrigger id="epic-status" className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Color</Label>
            <div className="mt-1.5 flex gap-2">
              {EPIC_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  title={c.label}
                  onClick={() => setColor(c.value)}
                  disabled={isSubmitting}
                  className={cn(
                    "h-7 w-7 rounded-full border-2 transition-transform",
                    color === c.value ? "scale-110 border-foreground" : "border-transparent"
                  )}
                  style={{ backgroundColor: c.value }}
                  aria-label={`Color: ${c.label}`}
                  aria-pressed={color === c.value}
                />
              ))}
            </div>
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {isSubmitting ? "Saving…" : isEdit ? "Save changes" : "Create epic"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
