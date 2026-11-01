"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTenant } from "@/context/tenant-context";
import {
  fetchEpics,
  createEpic,
  updateEpic,
  deleteEpic,
  type CreateEpicPayload,
  type UpdateEpicPayload,
} from "@/services/api/epics.api";
import { fetchProjects } from "@/services/api/projects.api";
import { parseApiError } from "@/services/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  EpicCreateEditModal,
  type EpicFormPayload,
} from "@/components/epics/epic-create-edit-modal";
import { EPIC_STATUS_LABEL, EPIC_STATUS_BADGE_CLASS } from "@/lib/epic-badges";
import type { Epic } from "@/types/api";
import { Flag, Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

export default function EpicsPage() {
  const { orgId } = useTenant();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [projectFilter, setProjectFilter] = React.useState("all");
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingEpic, setEditingEpic] = React.useState<Epic | null>(null);
  const [deletingEpic, setDeletingEpic] = React.useState<Epic | null>(null);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
    enabled: !!orgId,
  });

  const { data: epics = [], isLoading } = useQuery({
    queryKey: ["epics", orgId ?? "", projectFilter],
    queryFn: () => fetchEpics({ projectId: projectFilter === "all" ? undefined : projectFilter }),
    enabled: !!orgId,
  });

  const projectName = React.useCallback(
    (id: string) => projects.find((p) => p.id === id)?.name ?? "—",
    [projects]
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["epics", orgId ?? ""] });

  const createMutation = useMutation({
    mutationFn: (payload: CreateEpicPayload) => createEpic(payload),
    onSuccess: () => {
      invalidate();
      setModalOpen(false);
      toast({ title: "Epic created", variant: "success" });
    },
    onError: (err) => {
      toast({ title: "Failed to create epic", description: parseApiError(err), variant: "error" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateEpicPayload }) => updateEpic(id, payload),
    onSuccess: () => {
      invalidate();
      setModalOpen(false);
      setEditingEpic(null);
      toast({ title: "Epic updated", variant: "success" });
    },
    onError: (err) => {
      toast({ title: "Failed to update epic", description: parseApiError(err), variant: "error" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEpic(id),
    onSuccess: () => {
      invalidate();
      setDeletingEpic(null);
      toast({ title: "Epic deleted", variant: "default" });
    },
    onError: (err) => {
      toast({ title: "Failed to delete epic", description: parseApiError(err), variant: "error" });
    },
  });

  const handleSubmit = (payload: EpicFormPayload) => {
    if (editingEpic) {
      // UpdateEpicDto doesn't accept projectId - a project can't be changed after creation.
      const { projectId: _projectId, ...updatePayload } = payload;
      updateMutation.mutate({ id: editingEpic.id, payload: updatePayload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const openCreate = () => {
    setEditingEpic(null);
    setModalOpen(true);
  };

  const openEdit = (epic: Epic) => {
    setEditingEpic(epic);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Epics</h1>
          <p className="mt-1 text-muted-foreground">
            Groups of related tasks — track progress across the roadmap.
          </p>
        </div>
        <Button onClick={openCreate} className="shrink-0 gap-1.5">
          <Plus className="h-4 w-4" /> New epic
        </Button>
      </div>

      <Select value={projectFilter} onValueChange={setProjectFilter}>
        <SelectTrigger className="w-full sm:w-[220px]" aria-label="Filter by project">
          <SelectValue placeholder="All projects" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All projects</SelectItem>
          {projects.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : epics.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Flag className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold">No epics yet</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Group related tasks into an epic to track progress on the roadmap.
              </p>
            </div>
            <Button onClick={openCreate} size="sm" className="mt-2 gap-1.5">
              <Plus className="h-4 w-4" /> New epic
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {epics.map((epic) => {
            const pct = epic.taskCount > 0 ? Math.round((epic.completedTaskCount / epic.taskCount) * 100) : 0;
            return (
              <Card key={epic.id}>
                <CardContent className="flex items-center gap-4 p-5">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: epic.color ?? "#7c3aed" }}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold">{epic.title}</p>
                      <Badge className={EPIC_STATUS_BADGE_CLASS[epic.status]}>
                        {EPIC_STATUS_LABEL[epic.status]}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {projectName(epic.projectId)} · {epic.taskCount} task{epic.taskCount === 1 ? "" : "s"} ·{" "}
                      {pct}% complete
                    </p>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: epic.color ?? "#7c3aed" }}
                      />
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(epic)}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeletingEpic(epic)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <EpicCreateEditModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setEditingEpic(null);
        }}
        epic={editingEpic}
        defaultProjectId={projectFilter === "all" ? undefined : projectFilter}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        error={
          createMutation.error
            ? parseApiError(createMutation.error)
            : updateMutation.error
              ? parseApiError(updateMutation.error)
              : null
        }
      />

      <ConfirmDialog
        open={!!deletingEpic}
        onOpenChange={(open) => !open && setDeletingEpic(null)}
        title="Delete epic?"
        description={`"${deletingEpic?.title ?? ""}" will be permanently removed. Tasks linked to it keep their history but lose the epic reference.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          if (deletingEpic) deleteMutation.mutate(deletingEpic.id);
        }}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
