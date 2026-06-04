import JSZip from "jszip";
import type { CreateTaskPayload } from "@/services/api/tasks.api";
import { uploadAttachment } from "@/services/api/attachments.api";
import { parseTasksCsvContent, type ParsedTaskCsvRow } from "@/lib/tasks-csv";
import {
  mapParsedRowToCreatePayload,
  type ImportTasksCsvContext,
  type ImportTasksResult,
} from "@/lib/import-tasks-csv";

export interface ParsedTasksZip {
  rows: ParsedTaskCsvRow[];
  errors: string[];
  mediaByExportKey: Map<string, File[]>;
}

export async function parseTasksZipFile(file: File): Promise<ParsedTasksZip> {
  const zip = await JSZip.loadAsync(file);
  const csvEntry = zip.file("tasks.csv");
  if (!csvEntry) {
    return {
      rows: [],
      errors: ['ZIP must contain "tasks.csv" (export from Mini Task Manager → Export ZIP).'],
      mediaByExportKey: new Map(),
    };
  }

  const csvText = await csvEntry.async("string");
  const { rows, errors } = parseTasksCsvContent(csvText);

  const mediaByExportKey = new Map<string, File[]>();
  const loadPromises: Promise<void>[] = [];

  for (const [path, entry] of Object.entries(zip.files)) {
    if (!path.startsWith("media/") || entry.dir) continue;
    const match = path.match(/^media\/([^/]+)\/(.+)$/);
    if (!match) continue;
    const exportKey = match[1];
    const fileName = match[2].split("/").pop() ?? match[2];

    loadPromises.push(
      entry.async("blob").then((blob) => {
        const file = new File([blob], fileName, {
          type: blob.type || "application/octet-stream",
        });
        const list = mediaByExportKey.get(exportKey) ?? [];
        list.push(file);
        mediaByExportKey.set(exportKey, list);
      })
    );
  }
  await Promise.all(loadPromises);

  return { rows, errors, mediaByExportKey };
}

export async function importTasksFromZip(
  parsed: ParsedTasksZip,
  options: {
    projectId: string;
    organizationId: string;
    context: ImportTasksCsvContext;
    createTask: (payload: CreateTaskPayload) => Promise<{ id: string }>;
    onProgress?: (done: number, total: number, message?: string) => void;
  }
): Promise<ImportTasksResult & { mediaUploaded: number }> {
  const failed: ImportTasksResult["failed"] = [];
  let created = 0;
  let mediaUploaded = 0;
  const { rows, mediaByExportKey } = parsed;
  const { projectId, organizationId, context, createTask, onProgress } = options;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    onProgress?.(i + 1, rows.length, `Creating "${row.title}"…`);
    try {
      const payload = mapParsedRowToCreatePayload(row, context, projectId, organizationId);
      const createdTask = await createTask(payload);
      created++;

      const exportKey = row.exportKey;
      const mediaFiles =
        (exportKey && mediaByExportKey.get(exportKey)) ||
        (exportKey ? [] : []);

      if (mediaFiles.length && createdTask?.id) {
        for (const file of mediaFiles) {
          try {
            await uploadAttachment(createdTask.id, file);
            mediaUploaded++;
          } catch {
            // Continue other files
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      failed.push({ row: row.rowNumber, title: row.title, error: message });
    }
    onProgress?.(i + 1, rows.length);
  }

  return { created, failed, mediaUploaded };
}
