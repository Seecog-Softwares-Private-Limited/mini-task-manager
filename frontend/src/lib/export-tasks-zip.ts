import JSZip from "jszip";
import type { BoardFilters } from "@/components/kanban/kanban-board";
import type { Task, WorkflowStatus } from "@/types/api";
import { fetchAttachments, fetchAttachmentBlob } from "@/services/api/attachments.api";
import {
  buildTasksCsv,
  filterTasksByBoardFilters,
  sanitizeExportFilename,
} from "@/lib/export-tasks-csv";
import { TASKS_CSV_HEADERS_ZIP } from "@/lib/tasks-csv";

export interface TaskZipExportEntry {
  task: Task;
  exportKey: string;
  mediaFileNames: string[];
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

function buildTasksCsvWithMedia(
  entries: TaskZipExportEntry[],
  options: {
    projectName?: string;
    statusNameById: Record<string, string>;
    assigneeNameById: Record<string, string>;
  }
): string {
  const baseCsv = buildTasksCsv(
    entries.map((e) => e.task),
    options
  );
  const lines = baseCsv.split(/\r?\n/);
  if (lines.length === 0) return baseCsv;

  const header = TASKS_CSV_HEADERS_ZIP.map(escapeCsvCell).join(",");
  const dataLines = entries.map((entry, idx) => {
    const line = lines[idx + 1] ?? "";
    const extra = [
      escapeCsvCell(entry.exportKey),
      escapeCsvCell(entry.mediaFileNames.join("; ")),
    ].join(",");
    return line ? `${line},${extra}` : extra;
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
  let mediaFiles = 0;

  for (let i = 0; i < list.length; i++) {
    const task = list[i];
    const exportKey = `task-${String(i + 1).padStart(4, "0")}`;
    options.onProgress?.(`Exporting media for "${task.title}"…`, i + 1, list.length);

    const mediaFileNames: string[] = [];
    try {
      const attachments = await fetchAttachments(task.id);
      const folder = mediaRoot?.folder(exportKey);
      for (let j = 0; j < attachments.length; j++) {
        const att = attachments[j];
        const fileName = sanitizeZipFileName(att.fileName, j + 1);
        if (mediaFileNames.includes(fileName)) continue;
        try {
          const blob = await fetchAttachmentBlob(att.id);
          folder?.file(fileName, blob);
          mediaFileNames.push(fileName);
          mediaFiles++;
        } catch {
          // Skip attachments that fail to download
        }
      }
    } catch {
      // Task may have no attachments endpoint access — continue
    }

    entries.push({ task, exportKey, mediaFileNames });
  }

  const csv = buildTasksCsvWithMedia(entries, {
    projectName: options.projectName,
    statusNameById,
    assigneeNameById: options.assigneeNameById,
  });

  zip.file("tasks.csv", "\uFEFF" + csv);
  zip.file(
    "README.txt",
    [
      "Mini Task Manager — project task export",
      "",
      "Contents:",
      "- tasks.csv — task details (open in Excel or re-import)",
      "- media/ — images and files attached to each task",
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
