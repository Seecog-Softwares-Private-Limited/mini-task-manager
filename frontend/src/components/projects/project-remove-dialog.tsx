"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Project } from "@/types/api";
import { Archive, ArchiveRestore, Trash2 } from "lucide-react";

export interface ProjectRemoveDialogProps {
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onArchive: () => void | Promise<void>;
  onRestore: () => void | Promise<void>;
  onDeletePermanently: () => void | Promise<void>;
  archiveLoading?: boolean;
  deleteLoading?: boolean;
}

export function ProjectRemoveDialog({
  project,
  open,
  onOpenChange,
  onArchive,
  onRestore,
  onDeletePermanently,
  archiveLoading = false,
  deleteLoading = false,
}: ProjectRemoveDialogProps) {
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const busy = archiveLoading || deleteLoading;

  React.useEffect(() => {
    if (!open) setConfirmDelete(false);
  }, [open]);

  if (!project) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]" showClose={!busy}>
        <DialogHeader>
          <DialogTitle>
            {confirmDelete
              ? "Delete project permanently?"
              : project.isArchived
                ? "Manage archived project"
                : "Remove project"}
          </DialogTitle>
          <DialogDescription>
            {confirmDelete ? (
              <>
                Permanently delete <strong className="text-foreground">{project.name}</strong>? All
                tasks, attachments, and board data will be removed. This cannot be undone.
              </>
            ) : project.isArchived ? (
              <>
                Restore <strong className="text-foreground">{project.name}</strong> to active projects,
                or delete it permanently.
              </>
            ) : (
              <>
                Choose how to remove <strong className="text-foreground">{project.name}</strong>. Archive
                hides it from active lists and you can restore later.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {confirmDelete ? (
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setConfirmDelete(false)}
            >
              Back
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={() => void onDeletePermanently()}
            >
              {deleteLoading ? "Deleting…" : "Delete permanently"}
            </Button>
          </DialogFooter>
        ) : (
          <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              {project.isArchived ? (
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() => void onRestore()}
                  className="gap-2"
                >
                  <ArchiveRestore className="h-4 w-4" />
                  {archiveLoading ? "Restoring…" : "Restore"}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => void onArchive()}
                  className="gap-2"
                >
                  <Archive className="h-4 w-4" />
                  {archiveLoading ? "Archiving…" : "Archive"}
                </Button>
              )}
            </div>
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              className="w-full gap-2 sm:w-auto"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="h-4 w-4" />
              Delete permanently
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
