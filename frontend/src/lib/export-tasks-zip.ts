import JSZip from "jszip";
import type { BoardFilters } from "@/components/kanban/kanban-board";
import type { Task, WorkflowStatus } from "@/types/api";
import { fetchAttachments, fetchAttachmentBlob } from "@/services/api/attachments.api";
import {
  fetchEntityAttachmentBlob,
  fetchEntityAttachments,
} from "@/services/api/entity-attachments.api";
import {
  buildTaskCsvRowCells,
  filterTasksByBoardFilters,
  sanitizeExportFilename,
} from "@/lib/export-tasks-csv";
import { TASKS_CSV_HEADERS_ZIP } from "@/lib/tasks-csv";

export interface TaskZipExportEntry {
  task: Task;
  exportKey: string;
  mediaFileNames: string[];
}

type MediaTarget = "task" | "subtask";

interface TaskZipMediaMapItem {
  path: string;
  fileName: string;
  target: MediaTarget;
  subtaskIndex?: number;
  subtaskTitle?: string;
}

interface TaskZipMediaMap {
  version: 1;
  generatedAt: string;
  byTask: Record<string, TaskZipMediaMapItem[]>;
}

function escapeCsvCell(value: string | number | null | undefined): string {
  if (value == null) return "";
  const s = String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function sanitizeZipFileName(name: string, index: number): string {
  const base = (name || `file-${index}`)
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 120);
  return base || `file-${index}`;
}

function toUniqueFileName(fileName: string, usedNames: Set<string>): string {
  if (!usedNames.has(fileName)) {
    usedNames.add(fileName);
    return fileName;
  }
  const dot = fileName.lastIndexOf(".");
  const stem = dot > 0 ? fileName.slice(0, dot) : fileName;
  const ext = dot > 0 ? fileName.slice(dot) : "";
  let suffix = 2;
  let next = `${stem}-${suffix}${ext}`;
  while (usedNames.has(next)) {
    suffix += 1;
    next = `${stem}-${suffix}${ext}`;
  }
  usedNames.add(next);
  return next;
}

function buildTasksCsvWithMedia(
  entries: TaskZipExportEntry[],
  options: {
    projectName?: string;
    statusNameById: Record<string, string>;
    assigneeNameById: Record<string, string>;
  }
): string {
  const header = TASKS_CSV_HEADERS_ZIP.map(escapeCsvCell).join(",");
  const dataLines = entries.map((entry) => {
    const cells = buildTaskCsvRowCells(entry.task, { ...options, dateFormat: "iso" });
    cells.push(entry.exportKey, entry.mediaFileNames.join("; "));
    return cells.map(escapeCsvCell).join(",");
  });

  return [header, ...dataLines].join("\r\n");
}

export async function exportTasksToZipFile(
  tasks: Task[],
  options: {
    projectName?: string;
    statuses: WorkflowStatus[];
    assigneeNameById: Record<string, string>;
    filters?: BoardFilters;
    onlyFiltered?: boolean;
    onProgress?: (message: string, current: number, total: number) => void;
  }
): Promise<{ count: number; filename: string; mediaFiles: number }> {
  const statusNameById: Record<string, string> = {};
  for (const s of options.statuses) statusNameById[s.id] = s.name;

  const statusOrder = new Map(options.statuses.map((s, i) => [s.id, i]));
  const priorityOrder: Record<string, number> = {
    CRITICAL: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
  };

  let list = [...tasks];
  if (options.onlyFiltered && options.filters) {
    list = filterTasksByBoardFilters(list, options.filters);
  }

  list.sort((a, b) => {
    const sa = statusOrder.get(a.statusId ?? "") ?? 999;
    const sb = statusOrder.get(b.statusId ?? "") ?? 999;
    if (sa !== sb) return sa - sb;
    const pa = priorityOrder[a.priority] ?? 9;
    const pb = priorityOrder[b.priority] ?? 9;
    if (pa !== pb) return pa - pb;
    return a.title.localeCompare(b.title);
  });

  const zip = new JSZip();
  const mediaRoot = zip.folder("media");
  const entries: TaskZipExportEntry[] = [];
  const mediaMapByTask: Record<string, TaskZipMediaMapItem[]> = {};
  let mediaFiles = 0;

  for (let i = 0; i < list.length; i++) {
    const task = list[i];
    const exportKey = `task-${String(i + 1).padStart(4, "0")}`;
    options.onProgress?.(`Exporting media for "${task.title}"…`, i + 1, list.length);

    const mediaFileNames: string[] = [];
    const mediaMapItems: TaskZipMediaMapItem[] = [];
    const usedFileNames = new Set<string>();
    try {
      const taskFolder = mediaRoot?.folder(exportKey);
      const taskMediaFolder = taskFolder?.folder("task");
      const subtaskMediaRoot = taskFolder?.folder("subtasks");

      const [legacyTaskAttachments, entityTaskAttachments] = await Promise.allSettled([
        fetchAttachments(task.id),
        fetchEntityAttachments("TASK", task.id, task.id),
      ]);
      const taskAttachments = [
        ...(legacyTaskAttachments.status === "fulfilled" ? legacyTaskAttachments.value : []),
        ...(entityTaskAttachments.status === "fulfilled" ? entityTaskAttachments.value : []),
      ];

      for (let j = 0; j < taskAttachments.length; j++) {
        const attachment = taskAttachments[j];
        const rawName =
          "fileName" in attachment ? attachment.fileName : attachment.originalFileName;
        const safeName = sanitizeZipFileName(rawName, j + 1);
        const fileName = toUniqueFileName(safeName, usedFileNames);
        try {
          const blob =
            "fileName" in attachment
              ? await fetchAttachmentBlob(attachment.id, attachment.fileName)
              : await fetchEntityAttachmentBlob(attachment.id);
          const path = `media/${exportKey}/task/${fileName}`;
          taskMediaFolder?.file(fileName, blob);
          mediaFileNames.push(fileName);
          mediaMapItems.push({ path, fileName, target: "task" });
          mediaFiles++;
        } catch {
          // Skip attachments that fail to download
        }
      }

      const subtasks = task.subtasks ?? [];
      for (let subtaskIndex = 0; subtaskIndex < subtasks.length; subtaskIndex++) {
        const subtask = subtasks[subtaskIndex];
        let subtaskAttachments: Awaited<ReturnType<typeof fetchEntityAttachments>> = [];
        try {
          subtaskAttachments = await fetchEntityAttachments("SUBTASK", subtask.id, task.id);
        } catch {
          subtaskAttachments = [];
        }
        if (!subtaskAttachments.length) continue;

        const subtaskFolderName = `${String(subtaskIndex + 1).padStart(2, "0")}-${sanitizeZipFileName(subtask.title, subtaskIndex + 1)}`;
        const subtaskFolder = subtaskMediaRoot?.folder(subtaskFolderName);
        for (let j = 0; j < subtaskAttachments.length; j++) {
          const attachment = subtaskAttachments[j];
          const safeName = sanitizeZipFileName(attachment.originalFileName, j + 1);
          const fileName = toUniqueFileName(safeName, usedFileNames);
          try {
            const blob = await fetchEntityAttachmentBlob(attachment.id);
            const path = `media/${exportKey}/subtasks/${subtaskFolderName}/${fileName}`;
            subtaskFolder?.file(fileName, blob);
            mediaFileNames.push(fileName);
            mediaMapItems.push({
              path,
              fileName,
              target: "subtask",
              subtaskIndex,
              subtaskTitle: subtask.title,
            });
            mediaFiles++;
          } catch {
            // Skip attachments that fail to download
          }
        }
      }
    } catch {
      // Task may have no attachments endpoint access — continue
    }

    mediaMapByTask[exportKey] = mediaMapItems;
    entries.push({ task, exportKey, mediaFileNames });
  }

  const csv = buildTasksCsvWithMedia(entries, {
    projectName: options.projectName,
    statusNameById,
    assigneeNameById: options.assigneeNameById,
  });

  zip.file("tasks.csv", "\uFEFF" + csv);
  const mediaMap: TaskZipMediaMap = {
    version: 1,
    generatedAt: new Date().toISOString(),
    byTask: mediaMapByTask,
  };
  zip.file("media-map.json", JSON.stringify(mediaMap, null, 2));
  zip.file(
    "README.txt",
    [
      "OpsPick — project task export",
      "",
      "Contents:",
      "- tasks.csv — task details (open in Excel or re-import)",
      "- media/ — images and files for task + subtask attachments",
      "- media-map.json — attachment-to-task/subtask mapping used during import",
      "",
      "Each task folder is named like task-0001 and matches the Export Key column in tasks.csv.",
      "To import into another project, use Import ZIP in the Tasks page.",
    ].join("\n")
  );
  zip.file(
    "manifest.json",
    JSON.stringify(
      {
        version: 1,
        format: "mini-task-manager-tasks-zip",
        projectName: options.projectName ?? null,
        exportedAt: new Date().toISOString(),
        taskCount: entries.length,
        mediaFileCount: mediaFiles,
      },
      null,
      2
    )
  );

  options.onProgress?.("Creating ZIP file…", list.length, list.length);
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });

  const date = new Date().toISOString().slice(0, 10);
  const base = sanitizeExportFilename(options.projectName ?? "tasks");
  const filename = `${base}-tasks-${date}.zip`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  return { count: list.length, filename, mediaFiles };
}
