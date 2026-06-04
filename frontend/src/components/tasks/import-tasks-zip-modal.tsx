"use client";

import { useCallback, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { buildAssigneeLookup } from "@/lib/import-tasks-csv";
import { importTasksFromZip, parseTasksZipFile } from "@/lib/import-tasks-zip";
import { createTask } from "@/services/api/tasks.api";
import { parseApiError } from "@/services/api/client";
import type { WorkflowStatus } from "@/types/api";
import { FileArchive, Upload } from "lucide-react";

export interface ImportTasksZipModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  organizationId: string;
  projectName: string;
  statuses: WorkflowStatus[];
  assigneeNameById: Record<string, string>;
  onImported?: () => void;
}

export function ImportTasksZipModal({
  open,
  onOpenChange,
  projectId,
  organizationId,
  projectName,
  statuses,
  assigneeNameById,
  onImported,
}: ImportTasksZipModalProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedCount, setParsedCount] = useState(0);
  const [mediaCount, setMediaCount] = useState(0);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [parsedZip, setParsedZip] = useState<Awaited<ReturnType<typeof parseTasksZipFile>> | null>(
    null
  );
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, message: "" });

  const reset = useCallback(() => {
    setFileName(null);
    setParsedCount(0);
    setMediaCount(0);
    setParseErrors([]);
    setParsedZip(null);
    setProgress({ done: 0, total: 0, message: "" });
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const handleClose = useCallback(
    (next: boolean) => {
      if (importing) return;
      if (!next) reset();
      onOpenChange(next);
    },
    [importing, onOpenChange, reset]
  );

  const handleFile = useCallback(async (file: File) => {
    const isZip =
      file.name.toLowerCase().endsWith(".zip") || file.type === "application/zip";
    if (!isZip) {
      setParseErrors(["Please choose a .zip file exported from Mini Task Manager."]);
      return;
    }
    const parsed = await parseTasksZipFile(file);
    let totalMedia = 0;
    for (const files of Array.from(parsed.mediaByExportKey.values())) {
      totalMedia += files.length;
    }
    setFileName(file.name);
    setParsedZip(parsed);
    setParsedCount(parsed.rows.length);
    setMediaCount(totalMedia);
    setParseErrors(parsed.errors);
  }, []);

  const handleImport = useCallback(async () => {
    if (!parsedZip?.rows.length || !organizationId?.trim() || !projectId?.trim()) return;

    setImporting(true);
    setProgress({ done: 0, total: parsedZip.rows.length, message: "Starting…" });

    try {
      const result = await importTasksFromZip(parsedZip, {
        projectId,
        organizationId,
        context: {
          statuses,
          assigneeLookup: buildAssigneeLookup(assigneeNameById),
          defaultStatusId: statuses[0]?.id,
        },
        createTask: async (payload) => {
          const task = await createTask(payload);
          return { id: task.id };
        },
        onProgress: (done, total, message) =>
          setProgress({ done, total, message: message ?? "" }),
      });

      onImported?.();

      if (result.failed.length === 0) {
        toast({
          title: "Import complete",
          description: `${result.created} task${result.created === 1 ? "" : "s"} and ${result.mediaUploaded} file${result.mediaUploaded === 1 ? "" : "s"} imported into ${projectName}.`,
          variant: "success",
        });
        handleClose(false);
      } else {
        toast({
          title: "Import finished with errors",
          description: `${result.created} created, ${result.mediaUploaded} files uploaded, ${result.failed.length} failed.`,
          variant: "error",
        });
      }
    } catch (err) {
      toast({
        title: "Import failed",
        description: parseApiError(err),
        variant: "error",
      });
    } finally {
      setImporting(false);
    }
  }, [
    parsedZip,
    organizationId,
    projectId,
    statuses,
    assigneeNameById,
    projectName,
    onImported,
    toast,
    handleClose,
  ]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileArchive className="h-5 w-5 text-primary" />
            Import tasks from ZIP
          </DialogTitle>
          <DialogDescription>
            Import a ZIP exported from Mini Task Manager into{" "}
            <strong className="text-foreground">{projectName}</strong>. Tasks and images in the{" "}
            <code className="text-xs">media/</code> folders are recreated in this project.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <input
            ref={inputRef}
            type="file"
            accept=".zip,application/zip"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            disabled={importing}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            {fileName ? `Selected: ${fileName}` : "Choose ZIP file"}
          </Button>

          {parseErrors.length > 0 && (
            <ul className="text-sm text-destructive list-disc pl-5 space-y-1">
              {parseErrors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}

          {parsedCount > 0 && (
            <p className="text-sm text-muted-foreground">
              Ready to import <strong className="text-foreground">{parsedCount}</strong> task
              {parsedCount === 1 ? "" : "s"}
              {mediaCount > 0 && (
                <>
                  {" "}
                  with <strong className="text-foreground">{mediaCount}</strong> image/file
                  {mediaCount === 1 ? "" : "s"}
                </>
              )}
              .
            </p>
          )}

          {importing && progress.total > 0 && (
            <p className="text-sm text-muted-foreground">
              {progress.message || "Importing…"} {progress.done} / {progress.total}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" disabled={importing} onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={
              importing ||
              parsedCount === 0 ||
              parseErrors.some((e) => e.includes("must contain"))
            }
            onClick={() => void handleImport()}
            data-cy="import-tasks-zip-submit"
          >
            {importing ? "Importing…" : `Import ${parsedCount || ""} task${parsedCount === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
