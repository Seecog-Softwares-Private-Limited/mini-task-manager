"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchProject, updateProject } from "@/services/api/projects.api";
import { useTenant } from "@/context/tenant-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/use-toast";
import { parseApiError } from "@/services/api/client";
import { Settings, Archive, ArchiveRestore } from "lucide-react";

export default function ProjectSettingsPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { orgId } = useTenant();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);

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
      setArchiveConfirmOpen(false);
      toast({ title: isArchived ? "Project archived" : "Project restored", variant: "success" });
    },
    onError: (err) => toast({ title: "Failed to update", description: parseApiError(err), variant: "error" }),
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
            Name, visibility, and archive. Organization-level settings are in Settings.
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
            variant={project.isArchived ? "default" : "outline"}
            className={project.isArchived ? "" : "border-amber-500/50 text-amber-600 hover:bg-amber-500/10"}
            onClick={() => setArchiveConfirmOpen(true)}
            disabled={archiveMutation.isPending}
          >
            {project.isArchived ? "Restore project" : "Archive project"}
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={archiveConfirmOpen}
        onOpenChange={setArchiveConfirmOpen}
        title={project.isArchived ? "Restore project" : "Archive project"}
        description={
          project.isArchived
            ? `Restore "${project.name}"? It will appear in project lists again.`
            : `Archive "${project.name}"? You can restore it later from project settings.`
        }
        confirmLabel={project.isArchived ? "Restore" : "Archive"}
        variant="destructive"
        onConfirm={() => archiveMutation.mutate(!project.isArchived)}
        loading={archiveMutation.isPending}
      />
    </div>
  );
}
