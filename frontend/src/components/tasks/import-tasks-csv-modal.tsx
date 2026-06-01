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
import { parseTasksCsvContent } from "@/lib/tasks-csv";
import {
  buildAssigneeLookup,
  importTasksFromCsv,
  type ImportTasksCsvContext,
} from "@/lib/import-tasks-csv";
import { createTask } from "@/services/api/tasks.api";
import { parseApiError } from "@/services/api/client";
import type { WorkflowStatus } from "@/types/api";
import { FileUp, Upload } from "lucide-react";

export interface ImportTasksCsvModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  organizationId: string;
  projectName: string;
  statuses: WorkflowStatus[];
  assigneeNameById: Record<string, string>;
  onImported?: () => void;
}

export function ImportTasksCsvModal({
  open,
  onOpenChange,
  projectId,
  organizationId,
  projectName,
  statuses,
  assigneeNameById,
  onImported,
}: ImportTasksCsvModalProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedCount, setParsedCount] = useState(0);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [rows, setRows] = useState<ReturnType<typeof parseTasksCsvContent>["rows"]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const reset = useCallback(() => {
    setFileName(null);
    setParsedCount(0);
    setParseErrors([]);
    setRows([]);
    setProgress({ done: 0, total: 0 });
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const handleClose = useCallback(
    (next: boolean) => {
      if (importing) return;
      if (!next) reset();
      onOpenChange(next);
    },
    [importing, onOpenChange, reset],
  );

  const handleFile = useCallback(async (file: File) => {
    const text = await file.text();
    const { rows: parsed, errors } = parseTasksCsvContent(text);
    setFileName(file.name);
    setRows(parsed);
    setParsedCount(parsed.length);
    setParseErrors(errors);
  }, []);

  const handleImport = useCallback(async () => {
    if (!rows.length || !orgIdReady(organizationId, projectId)) return;

    const context: ImportTasksCsvContext = {
      statuses,
      assigneeLookup: buildAssigneeLookup(assigneeNameById),
      defaultStatusId: statuses[0]?.id,
    };

    setImporting(true);
    setProgress({ done: 0, total: rows.length });

    try {
      const result = await importTasksFromCsv(rows, {
        projectId,
        organizationId,
        context,
        createTask: (payload) => createTask(payload),
        onProgress: (done, total) => setProgress({ done, total }),
      });

      onImported?.();

      if (result.failed.length === 0) {
        toast({
          title: "Import complete",
          description: `${result.created} task${result.created === 1 ? "" : "s"} added to ${projectName}.`,
          variant: "success",
        });
        handleClose(false);
      } else {
        toast({
          title: "Import finished with errors",
          description: `${result.created} created, ${result.failed.length} failed. First error: ${result.failed[0].error}`,
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
    rows,
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
            <FileUp className="h-5 w-5 text-primary" />
            Import tasks from CSV
          </DialogTitle>
          <DialogDescription>
            Import a file exported from Mini Task Manager into{" "}
            <strong className="text-foreground">{projectName}</strong>. Task IDs and
            project names in the file are ignored — new tasks are created in this project.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
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
            {fileName ? `Selected: ${fileName}` : "Choose CSV file"}
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
              Ready to import <strong className="text-foreground">{parsedCount}</strong>{" "}
              task{parsedCount === 1 ? "" : "s"} into this project.
            </p>
          )}

          {importing && progress.total > 0 && (
            <p className="text-sm text-muted-foreground">
              Importing… {progress.done} / {progress.total}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            disabled={importing}
            onClick={() => handleClose(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={importing || parsedCount === 0 || parseErrors.some((e) => e.includes("Missing"))}
            onClick={() => void handleImport()}
            data-cy="import-tasks-csv-submit"
          >
            {importing ? "Importing…" : `Import ${parsedCount || ""} task${parsedCount === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function orgIdReady(organizationId: string, projectId: string): boolean {
  return Boolean(organizationId?.trim() && projectId?.trim());
}
