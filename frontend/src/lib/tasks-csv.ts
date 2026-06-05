/** Column headers produced by export — import expects the same names (case-insensitive). */
export const TASKS_CSV_HEADERS = [
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
] as const;

/** ZIP export includes media mapping columns. */
export const TASKS_CSV_HEADERS_ZIP = [
  ...TASKS_CSV_HEADERS,
  "Export Key",
  "Media Files",
] as const;

const MONTH_BY_SHORT: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/** Parse CSV text (RFC 4180-style quoted fields). */
export function parseCsvText(content: string): string[][] {
  const text = content.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

/** Parse exported / Excel date text → `YYYY-MM-DD` for the API. */
export function parseCsvDateToYmd(value: string | undefined): string | undefined {
  let raw = (value ?? "").trim();
  if (!raw) return undefined;

  // Excel sometimes prefixes text dates with a single quote.
  if (raw.startsWith("'")) raw = raw.slice(1).trim();

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const dmy = raw.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
  if (dmy) {
    const a = Number(dmy[1]);
    const b = Number(dmy[2]);
    const year = Number(dmy[3]);
    let month: number;
    let day: number;
    if (a > 12) {
      day = a;
      month = b;
    } else if (b > 12) {
      month = a;
      day = b;
    } else {
      // Ambiguous — prefer DD/MM/YYYY (common outside US).
      day = a;
      month = b;
    }
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const dateOnly = raw.replace(/\s+\d{1,2}:\d{2}(?::\d{2})?.*$/, "");
  const pretty = dateOnly.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})/);
  if (pretty) {
    const month = MONTH_BY_SHORT[pretty[2].slice(0, 3).toLowerCase()];
    if (month) {
      return `${pretty[3]}-${String(month).padStart(2, "0")}-${String(Number(pretty[1])).padStart(2, "0")}`;
    }
  }

  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  return undefined;
}

function normalizeHeaderKey(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, " ");
}

export function buildCsvHeaderIndex(headerRow: string[]): Record<string, number> {
  const index: Record<string, number> = {};
  headerRow.forEach((h, i) => {
    index[normalizeHeaderKey(h)] = i;
  });
  return index;
}

function cellAt(row: string[], index: Record<string, number>, ...keys: string[]): string {
  for (const key of keys) {
    const i = index[normalizeHeaderKey(key)];
    if (i !== undefined) return (row[i] ?? "").trim();
  }
  return "";
}

function splitList(value: string): string[] {
  if (!value.trim()) return [];
  return value.split(";").map((s) => s.trim()).filter(Boolean);
}

function parseSubtasksDone(value: string): { done: number; total: number } | null {
  const m = value.trim().match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!m) return null;
  return { done: Number(m[1]), total: Number(m[2]) };
}

export interface ParsedTaskCsvRow {
  rowNumber: number;
  title: string;
  description?: string;
  statusName?: string;
  priority: string;
  assigneeNames: string[];
  dueDate?: string;
  storyPoints?: number;
  tags: string[];
  subtasks: Array<{ title: string; completed: boolean }>;
  /** Folder name under `media/` in ZIP export (e.g. task-0001). */
  exportKey?: string;
  /** Filenames inside `media/{exportKey}/`. */
  mediaFileNames: string[];
}

export function parseTasksCsvContent(content: string): {
  rows: ParsedTaskCsvRow[];
  errors: string[];
} {
  const errors: string[] = [];
  const table = parseCsvText(content);
  if (table.length === 0) {
    return { rows: [], errors: ["File is empty."] };
  }

  const headerIndex = buildCsvHeaderIndex(table[0]);
  const titleCol = headerIndex[normalizeHeaderKey("Title")];
  if (titleCol === undefined) {
    return {
      rows: [],
      errors: [
        'Missing "Title" column. Use a CSV exported from Mini Task Manager (Export CSV).',
      ],
    };
  }

  const rows: ParsedTaskCsvRow[] = [];

  for (let r = 1; r < table.length; r++) {
    const line = table[r];
    const rowNumber = r + 1;
    const title = cellAt(line, headerIndex, "Title");
    if (!title) continue;

    const priorityRaw = cellAt(line, headerIndex, "Priority") || "MEDIUM";
    const priority = priorityRaw.toUpperCase();
    const validPriority = ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(priority)
      ? priority
      : "MEDIUM";

    const storyRaw = cellAt(line, headerIndex, "Story Points");
    let storyPoints: number | undefined;
    if (storyRaw) {
      const n = Number(storyRaw);
      if (Number.isFinite(n) && n >= 0) storyPoints = Math.trunc(n);
    }

    const subtaskTitles = splitList(cellAt(line, headerIndex, "Subtasks"));
    const doneInfo = parseSubtasksDone(cellAt(line, headerIndex, "Subtasks Done"));
    const doneCount = doneInfo?.done ?? 0;
    const subtasks = subtaskTitles.map((t, i) => ({
      title: t,
      completed: i < doneCount,
    }));

    const exportKey = cellAt(line, headerIndex, "Export Key") || undefined;
    rows.push({
      rowNumber,
      title,
      description: cellAt(line, headerIndex, "Description") || undefined,
      statusName: cellAt(line, headerIndex, "Status") || undefined,
      priority: validPriority,
      assigneeNames: splitList(cellAt(line, headerIndex, "Assignee")),
      dueDate: parseCsvDateToYmd(cellAt(line, headerIndex, "Due Date")),
      storyPoints,
      tags: splitList(cellAt(line, headerIndex, "Tags")),
      subtasks,
      exportKey,
      mediaFileNames: splitList(cellAt(line, headerIndex, "Media Files")),
    });
  }

  if (rows.length === 0 && table.length > 1) {
    errors.push("No tasks with a Title found in the file.");
  }

  return { rows, errors };
}
