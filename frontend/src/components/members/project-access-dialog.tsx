"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { fetchProjects } from "@/services/api/projects.api";
import {
  fetchUserProjectAccess,
  setUserProjectAccess,
} from "@/services/api/members.api";
import { parseApiError } from "@/services/api/client";
import { cn } from "@/lib/utils";
import { Check, Loader2 } from "lucide-react";

export interface ProjectAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  memberLabel: string;
}

export function ProjectAccessDialog({
  open,
  onOpenChange,
  userId,
  memberLabel,
}: ProjectAccessDialogProps) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
    enabled: open,
  });

  const { data: currentIds, isLoading: accessLoading } = useQuery({
    queryKey: ["user-project-access", userId],
    queryFn: () => fetchUserProjectAccess(userId),
    enabled: open && !!userId,
  });

  React.useEffect(() => {
    if (!open) return;
    setSelected(new Set(currentIds ?? []));
  }, [open, currentIds]);

  const saveMutation = useMutation({
    mutationFn: () => setUserProjectAccess(userId, Array.from(selected)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-project-access", userId] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      onOpenChange(false);
    },
  });

  const loading = projectsLoading || accessLoading;
  const activeProjects = projects.filter((p) => !p.isArchived);

  const toggle = (projectId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update project access</DialogTitle>
          <DialogDescription>
            Choose which projects {memberLabel} can see. Changes apply immediately.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : activeProjects.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            No projects in this workspace yet.
          </p>
        ) : (
          <ul className="max-h-72 space-y-2 overflow-y-auto py-1">
            {activeProjects.map((project) => {
              const checked = selected.has(project.id);
              return (
                <li key={project.id}>
                  <button
                    type="button"
                    onClick={() => toggle(project.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                      checked
                        ? "border-primary/40 bg-primary/5"
                        : "border-border/60 hover:bg-muted/40"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                        checked
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/40"
                      )}
                    >
                      {checked ? <Check className="h-3.5 w-3.5" /> : null}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {project.name}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {saveMutation.error ? (
          <p className="text-sm text-destructive">{parseApiError(saveMutation.error)}</p>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={loading || saveMutation.isPending || activeProjects.length === 0}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
              </>
            ) : (
              "Save access"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
