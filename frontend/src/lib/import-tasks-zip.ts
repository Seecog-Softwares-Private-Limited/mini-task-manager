import JSZip from "jszip";
import type { CreateTaskPayload } from "@/services/api/tasks.api";
import { uploadAttachment } from "@/services/api/attachments.api";
import { uploadEntityAttachment } from "@/services/api/entity-attachments.api";
import { parseApiError } from "@/services/api/client";
import { blobToTypedFile } from "@/lib/file-mime";
import { parseTasksCsvContent, type ParsedTaskCsvRow } from "@/lib/tasks-csv";
import {
  mapParsedRowToCreatePayload,
  type ImportTasksCsvContext,
  type ImportTasksResult,
} from "@/lib/import-tasks-csv";
import type { Task } from "@/types/api";

type MediaTarget = "TASK" | "SUBTASK";

interface ZipMediaMapItem {
  path: string;
  fileName: string;
  target: "task" | "subtask";
  subtaskIndex?: number;
  subtaskTitle?: string;
}

interface ZipMediaMap {
  version: number;
  byTask?: Record<string, ZipMediaMapItem[]>;
}

interface ParsedZipMediaItem {
  file: File;
  target: MediaTarget;
  subtaskIndex?: number;
  subtaskTitle?: string;
}

export interface ParsedTasksZip {
  rows: ParsedTaskCsvRow[];
  errors: string[];
  mediaByExportKey: Map<string, File[]>;
  mediaItemsByExportKey: Map<string, ParsedZipMediaItem[]>;
}

function resolveExportKey(row: ParsedTaskCsvRow, rowIndex: number): string {
  const key = row.exportKey?.trim();
  if (key) return key;
  return `task-${String(rowIndex + 1).padStart(4, "0")}`;
}

function pickMediaFiles(
  exportKey: string,
  row: ParsedTaskCsvRow,
  mediaByExportKey: Map<string, File[]>
): File[] {
  const all = mediaByExportKey.get(exportKey) ?? [];
  if (!row.mediaFileNames.length) return all;

  const wanted = new Set(row.mediaFileNames.map((n) => n.trim().toLowerCase()).filter(Boolean));
  const matched = all.filter((f) => wanted.has(f.name.toLowerCase()));
  return matched.length ? matched : all;
}

function pickMediaItems(
  exportKey: string,
  row: ParsedTaskCsvRow,
  mediaByExportKey: Map<string, ParsedZipMediaItem[]>
): ParsedZipMediaItem[] {
  const all = mediaByExportKey.get(exportKey) ?? [];
  if (!row.mediaFileNames.length) return all;

  const wanted = new Set(row.mediaFileNames.map((n) => n.trim().toLowerCase()).filter(Boolean));
  const matched = all.filter((entry) => wanted.has(entry.file.name.toLowerCase()));
  return matched.length ? matched : all;
}

function parseSubtaskIndexFromPath(path: string): number | undefined {
  const match = path.match(/^media\/[^/]+\/subtasks\/(\d+)-[^/]+\//i);
  if (!match) return undefined;
  const index = Number(match[1]);
  return Number.isFinite(index) && index > 0 ? index - 1 : undefined;
}

export async function parseTasksZipFile(file: File): Promise<ParsedTasksZip> {
  const zip = await JSZip.loadAsync(file);
  const csvEntry = zip.file("tasks.csv");
  if (!csvEntry) {
    return {
      rows: [],
      errors: ['ZIP must contain "tasks.csv" (export from OpsPick → Export ZIP).'],
      mediaByExportKey: new Map(),
      mediaItemsByExportKey: new Map(),
    };
  }

  const csvText = await csvEntry.async("string");
  const { rows, errors } = parseTasksCsvContent(csvText);

  const mediaByExportKey = new Map<string, File[]>();
  const mediaItemsByExportKey = new Map<string, ParsedZipMediaItem[]>();
  const loadPromises: Promise<void>[] = [];
  const mediaMapEntry = zip.file("media-map.json");
  let mediaMapByPath: Record<string, ZipMediaMapItem> = {};
  if (mediaMapEntry) {
    try {
      const mapText = await mediaMapEntry.async("string");
      const parsed = JSON.parse(mapText) as ZipMediaMap;
      const byTask = parsed.byTask ?? {};
      for (const [exportKey, items] of Object.entries(byTask)) {
        for (const item of items ?? []) {
          if (!item?.path) continue;
          mediaMapByPath[item.path] = item;
        }
        if (!Array.isArray(items)) continue;
        if (!mediaItemsByExportKey.has(exportKey)) mediaItemsByExportKey.set(exportKey, []);
      }
    } catch {
      // Ignore malformed media-map and fall back to path heuristics.
      mediaMapByPath = {};
    }
  }

  for (const [path, entry] of Object.entries(zip.files)) {
    if (!path.startsWith("media/") || entry.dir) continue;
    const match = path.match(/^media\/([^/]+)\/(.+)$/);
    if (!match) continue;
    const exportKey = match[1];
    const fileName = match[2].split("/").pop() ?? match[2];

    loadPromises.push(
      entry.async("blob").then((blob) => {
        const file = blobToTypedFile(blob, fileName);
        const list = mediaByExportKey.get(exportKey) ?? [];
        list.push(file);
        mediaByExportKey.set(exportKey, list);

        const mapped = mediaMapByPath[path];
        const inferredTarget: MediaTarget = path.includes(`/subtasks/`) ? "SUBTASK" : "TASK";
        const target: MediaTarget =
          mapped?.target === "subtask" ? "SUBTASK" : mapped?.target === "task" ? "TASK" : inferredTarget;
        const subtaskIndex = mapped?.subtaskIndex ?? parseSubtaskIndexFromPath(path);
        const itemList = mediaItemsByExportKey.get(exportKey) ?? [];
        itemList.push({
          file,
          target,
          subtaskIndex,
          subtaskTitle: mapped?.subtaskTitle,
        });
        mediaItemsByExportKey.set(exportKey, itemList);
      })
    );
  }
  await Promise.all(loadPromises);

  return { rows, errors, mediaByExportKey, mediaItemsByExportKey };
}

export async function importTasksFromZip(
  parsed: ParsedTasksZip,
  options: {
    projectId: string;
    organizationId: string;
    context: ImportTasksCsvContext;
    createTask: (payload: CreateTaskPayload) => Promise<Task>;
    onProgress?: (done: number, total: number, message?: string) => void;
  }
): Promise<ImportTasksResult & { mediaUploaded: number; mediaFailed: number }> {
  const failed: ImportTasksResult["failed"] = [];
  let created = 0;
  let mediaUploaded = 0;
  let mediaFailed = 0;
  const { rows, mediaByExportKey, mediaItemsByExportKey } = parsed;
  const { projectId, organizationId, context, createTask, onProgress } = options;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    onProgress?.(i + 1, rows.length, `Creating "${row.title}"…`);
    try {
      const payload = mapParsedRowToCreatePayload(row, context, projectId, organizationId);
      const createdTask = await createTask(payload);
      created++;

      const exportKey = resolveExportKey(row, i);
      const explicitMediaItems = pickMediaItems(exportKey, row, mediaItemsByExportKey);
      const mediaItems =
        explicitMediaItems.length > 0
          ? explicitMediaItems
          : (pickMediaFiles(exportKey, row, mediaByExportKey).map((file) => ({
              file,
              target: "TASK" as const,
            })));
      const createdSubtasks = createdTask.subtasks ?? [];

      if (mediaItems.length && createdTask?.id) {
        for (const item of mediaItems) {
          const targetSubtask =
            item.target === "SUBTASK" && Number.isInteger(item.subtaskIndex)
              ? createdSubtasks[item.subtaskIndex as number]
              : undefined;
          try {
            if (targetSubtask?.id) {
              await uploadEntityAttachment("SUBTASK", targetSubtask.id, item.file, createdTask.id);
            } else {
              await uploadAttachment(createdTask.id, item.file);
            }
            mediaUploaded++;
          } catch (err) {
            mediaFailed++;
            failed.push({
              row: row.rowNumber,
              title: row.title,
              error: `Attachment "${item.file.name}": ${parseApiError(err)}`,
            });
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      failed.push({ row: row.rowNumber, title: row.title, error: message });
    }
    onProgress?.(i + 1, rows.length);
  }

  return { created, failed, mediaUploaded, mediaFailed };
}
