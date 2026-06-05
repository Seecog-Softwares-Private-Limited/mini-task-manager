import type { BoardFilters } from "@/components/kanban/kanban-board";
import type { Task, WorkflowStatus } from "@/types/api";
import { TASKS_CSV_HEADERS } from "@/lib/tasks-csv";

function escapeCsvCell(value: string | number | null | undefined): string {
  if (value == null) return "";
  const s = String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function stripHtml(html: string): string {
  if (!html) return "";
  if (typeof document !== "undefined") {
    const div = document.createElement("div");
    div.innerHTML = html;
    return (div.textContent ?? "").replace(/\s+/g, " ").trim();
  }
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/** Parse API / DB date strings without UTC day shift (YYYY-MM-DD prefix first). */
function parseDateParts(value: string): { day: number; month: number; year: number } | null {
  const ymd = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) {
    return { year: Number(ymd[1]), month: Number(ymd[2]), day: Number(ymd[3]) };
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return { day: d.getDate(), month: d.getMonth() + 1, year: d.getFullYear() };
}

/** ISO date for ZIP export/import (avoids Excel locale shifts). */
export function formatCsvDateIso(value: string | undefined | null): string {
  if (!value) return "";
  const parts = parseDateParts(String(value));
  if (!parts) return "";
  const { day, month, year } = parts;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Human-readable date for CSV (Excel shows `########` on narrow ISO date columns). */
function formatCsvDate(value: string | undefined | null): string {
  if (!value) return "";
  const parts = parseDateParts(String(value));
  if (!parts) return "";
  const { day, month, year } = parts;
  const mon = MONTH_SHORT[month - 1];
  if (!mon) return "";
  return `${day} ${mon} ${year}`;
}

/** Created / updated — include time, still plain text for Excel. */
function formatCsvDateTime(value: string | undefined | null): string {
  if (!value) return "";
  const raw = String(value);
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return formatCsvDate(raw);
  const datePart = formatCsvDate(raw);
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${datePart} ${h}:${min}`;
}

export function filterTasksByBoardFilters(tasks: Task[], filters: BoardFilters): Task[] {
  return tasks.filter((t) => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const desc = (t.description ?? "").toLowerCase();
      if (!t.title.toLowerCase().includes(q) && !desc.includes(q)) return false;
    }
    if (filters.priority.length > 0 && !filters.priority.includes(t.priority)) return false;
    if (filters.assignee.length > 0) {
      const assignees = t.assigneeIds?.length ? t.assigneeIds : t.assigneeId ? [t.assigneeId] : [];
      if (!assignees.some((id) => filters.assignee.includes(id))) return false;
    }
    return true;
  });
}

export type TasksCsvDateFormat = "pretty" | "iso";

export function buildTaskCsvRowCells(
  t: Task,
  options: {
    projectName?: string;
    statusNameById: Record<string, string>;
    assigneeNameById: Record<string, string>;
    dateFormat?: TasksCsvDateFormat;
  }
): Array<string | number> {
  const assigneeIds = t.assigneeIds?.length ? t.assigneeIds : t.assigneeId ? [t.assigneeId] : [];
  const assigneeNames = assigneeIds
    .map((id) => options.assigneeNameById[id] ?? t.assignee?.fullName ?? t.assignee?.email ?? id)
    .filter(Boolean)
    .join("; ");
  const subtasks = t.subtasks ?? [];
  const subtasksDone = subtasks.filter((s) => s.completed).length;
  const tagNames = (t.tags ?? []).map((tag) => tag.name).join("; ");
  const subtaskTitles = subtasks.map((s) => s.title).join("; ");
  const formatDueDate = options.dateFormat === "iso" ? formatCsvDateIso : formatCsvDate;

  return [
    t.id,
    t.title,
    stripHtml(t.description ?? ""),
    t.statusId ? options.statusNameById[t.statusId] ?? t.statusId : "",
    t.priority,
    assigneeNames,
    formatDueDate(t.dueDate),
    t.storyPoints ?? "",
    tagNames,
    subtaskTitles,
    subtasks.length ? `${subtasksDone}/${subtasks.length}` : "",
    formatCsvDateTime(t.createdAt),
    formatCsvDateTime(t.updatedAt),
    options.projectName ?? t.projectId,
  ];
}

export function buildTasksCsv(
  tasks: Task[],
  options: {
    projectName?: string;
    statusNameById: Record<string, string>;
    assigneeNameById: Record<string, string>;
    dateFormat?: TasksCsvDateFormat;
  }
): string {
  const headers = [...TASKS_CSV_HEADERS];

  const rows = tasks.map((t) =>
    buildTaskCsvRowCells(t, options)
      .map(escapeCsvCell)
      .join(",")
  );

  return [headers.map(escapeCsvCell).join(","), ...rows].join("\r\n");
}

export function downloadCsvFile(filename: string, csvContent: string): void {
  const blob = new Blob(["\uFEFF", csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function sanitizeExportFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(0, 80) || "tasks";
}

export function exportTasksToCsvFile(
  tasks: Task[],
  options: {
    projectName?: string;
    statuses: WorkflowStatus[];
    assigneeNameById: Record<string, string>;
    filters?: BoardFilters;
    onlyFiltered?: boolean;
  }
): { count: number; filename: string } {
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

  const csv = buildTasksCsv(list, {
    projectName: options.projectName,
    statusNameById,
    assigneeNameById: options.assigneeNameById,
  });

  const date = new Date().toISOString().slice(0, 10);
  const base = sanitizeExportFilename(options.projectName ?? "tasks");
  const filename = `${base}-tasks-${date}.csv`;
  downloadCsvFile(filename, csv);
  return { count: list.length, filename };
}
