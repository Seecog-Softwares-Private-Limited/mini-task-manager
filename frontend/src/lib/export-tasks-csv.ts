import type { BoardFilters } from "@/components/kanban/kanban-board";
import type { Task, WorkflowStatus } from "@/types/api";

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

function formatDate(value: string | undefined | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toISOString().slice(0, 10);
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

export function buildTasksCsv(
  tasks: Task[],
  options: {
    projectName?: string;
    statusNameById: Record<string, string>;
    assigneeNameById: Record<string, string>;
  }
): string {
  const headers = [
    "Task ID",
    "Title",
    "Description",
    "Status",
    "Priority",
    "Assignee",
    "Due Date",
    "Story Points",
    "Tags",
    "Subtasks",
    "Subtasks Done",
    "Created",
    "Updated",
    "Project",
  ];

  const rows = tasks.map((t) => {
    const assigneeIds = t.assigneeIds?.length ? t.assigneeIds : t.assigneeId ? [t.assigneeId] : [];
    const assigneeNames = assigneeIds
      .map((id) => options.assigneeNameById[id] ?? t.assignee?.fullName ?? t.assignee?.email ?? id)
      .filter(Boolean)
      .join("; ");
    const subtasks = t.subtasks ?? [];
    const subtasksDone = subtasks.filter((s) => s.completed).length;
    const tagNames = (t.tags ?? []).map((tag) => tag.name).join("; ");
    const subtaskTitles = subtasks.map((s) => s.title).join("; ");

    return [
      t.id,
      t.title,
      stripHtml(t.description ?? ""),
      t.statusId ? options.statusNameById[t.statusId] ?? t.statusId : "",
      t.priority,
      assigneeNames,
      formatDate(t.dueDate),
      t.storyPoints ?? "",
      tagNames,
      subtaskTitles,
      subtasks.length ? `${subtasksDone}/${subtasks.length}` : "",
      formatDate(t.createdAt),
      formatDate(t.updatedAt),
      options.projectName ?? t.projectId,
    ]
      .map(escapeCsvCell)
      .join(",");
  });

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
