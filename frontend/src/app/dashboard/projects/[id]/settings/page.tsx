"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchProject, updateProject, deleteProjectPermanently } from "@/services/api/projects.api";
import { useTenant } from "@/context/tenant-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectRemoveDialog } from "@/components/projects/project-remove-dialog";
import { useToast } from "@/components/ui/use-toast";
import { parseApiError } from "@/services/api/client";
import { Settings, Archive, ArchiveRestore, Trash2 } from "lucide-react";

export default function ProjectSettingsPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const { orgId } = useTenant();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);

  const { data: project } = useQuery({
    queryKey: ["project", id],
    queryFn: () => fetchProject(id),
    enabled: !!id && !!orgId,
  });

  const archiveMutation = useMutation({
    mutationFn: (isArchived: boolean) => updateProject(id, { isArchived }),
    onSuccess: (_, isArchived) => {
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      queryClient.invalidateQueries({ queryKey: ["projects", orgId ?? ""] });
      setRemoveDialogOpen(false);
      toast({ title: isArchived ? "Project archived" : "Project restored", variant: "success" });
    },
    onError: (err) => toast({ title: "Failed to update", description: parseApiError(err), variant: "error" }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteProjectPermanently(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", orgId ?? ""] });
      setRemoveDialogOpen(false);
      toast({ title: "Project deleted permanently", variant: "success" });
      router.push("/dashboard/projects");
    },
    onError: (err) =>
      toast({ title: "Failed to delete project", description: parseApiError(err), variant: "error" }),
  });

  if (!project) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" /> Project settings
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Name, visibility, and archive. Workspace-level settings are in Settings.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium">Visibility</p>
            <p className="text-sm text-muted-foreground">{project.visibility}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-amber-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            {project.isArchived ? <ArchiveRestore className="h-5 w-5" /> : <Archive className="h-5 w-5" />}
            {project.isArchived ? "Restore project" : "Archive project"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {project.isArchived
              ? "Restore this project so it appears in active lists and can be edited again."
              : "Archived projects are hidden from default views. You can restore them anytime."}
          </p>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="gap-2 border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
            onClick={() => setRemoveDialogOpen(true)}
            disabled={archiveMutation.isPending || deleteMutation.isPending}
          >
            {project.isArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
            {project.isArchived ? "Restore or delete" : "Archive or delete"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Danger zone
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Permanently delete this project and all of its tasks and attachments.
          </p>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => setRemoveDialogOpen(true)}
            disabled={deleteMutation.isPending}
          >
            Delete project permanently
          </Button>
        </CardContent>
      </Card>

      <ProjectRemoveDialog
        project={project}
        open={removeDialogOpen}
        onOpenChange={setRemoveDialogOpen}
        archiveLoading={archiveMutation.isPending}
        deleteLoading={deleteMutation.isPending}
        onArchive={async () => {
          if (project.isArchived) return;
          await archiveMutation.mutateAsync(true);
        }}
        onRestore={async () => {
          if (!project.isArchived) return;
          await archiveMutation.mutateAsync(false);
        }}
        onDeletePermanently={async () => {
          await deleteMutation.mutateAsync();
        }}
      />
    </div>
  );
}
