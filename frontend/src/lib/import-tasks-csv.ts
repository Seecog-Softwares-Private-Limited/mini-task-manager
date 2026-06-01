import type { CreateTaskPayload } from "@/services/api/tasks.api";
import type { WorkflowStatus } from "@/types/api";
import type { ParsedTaskCsvRow } from "@/lib/tasks-csv";

const DEFAULT_TAG_COLOR = "#8b5cf6";

export interface ImportTasksCsvContext {
  statuses: WorkflowStatus[];
  /** Lowercase name or email → user id */
  assigneeLookup: Record<string, string>;
  defaultStatusId?: string;
}

export function buildAssigneeLookup(
  assigneeNameById: Record<string, string>,
  extra?: Record<string, { name: string; email?: string }>,
): Record<string, string> {
  const lookup: Record<string, string> = {};
  const add = (id: string, label: string | undefined) => {
    const key = (label ?? "").trim().toLowerCase();
    if (key && !lookup[key]) lookup[key] = id;
  };

  for (const [id, name] of Object.entries(assigneeNameById)) {
    add(id, name);
  }
  if (extra) {
    for (const [id, info] of Object.entries(extra)) {
      add(id, info.name);
      if (info.email) add(id, info.email);
    }
  }
  return lookup;
}

function resolveStatusId(
  statusName: string | undefined,
  statuses: WorkflowStatus[],
  defaultStatusId?: string,
): string | undefined {
  if (!statuses.length) return defaultStatusId;
  if (statusName?.trim()) {
    const q = statusName.trim().toLowerCase();
    const exact = statuses.find((s) => s.name.toLowerCase() === q);
    if (exact) return exact.id;
    const partial = statuses.find((s) => s.name.toLowerCase().includes(q));
    if (partial) return partial.id;
  }
  const todo = statuses.find((s) => s.type === "TODO");
  return defaultStatusId ?? todo?.id ?? statuses[0]?.id;
}

function resolveAssigneeIds(
  names: string[],
  lookup: Record<string, string>,
): string[] {
  const ids: string[] = [];
  for (const name of names) {
    const key = name.toLowerCase();
    const id = lookup[key];
    if (id && !ids.includes(id)) ids.push(id);
    else {
      const partial = Object.entries(lookup).find(
        ([k]) => k.includes(key) || key.includes(k),
      );
      if (partial && !ids.includes(partial[1])) ids.push(partial[1]);
    }
  }
  return ids;
}

export function mapParsedRowToCreatePayload(
  row: ParsedTaskCsvRow,
  ctx: ImportTasksCsvContext,
  projectId: string,
  organizationId: string,
): CreateTaskPayload {
  const statusId = resolveStatusId(row.statusName, ctx.statuses, ctx.defaultStatusId);
  const assigneeIds = resolveAssigneeIds(row.assigneeNames, ctx.assigneeLookup);

  const payload: CreateTaskPayload = {
    projectId,
    organizationId,
    title: row.title.slice(0, 300),
    priority: row.priority,
  };

  if (row.description) payload.description = row.description;
  if (statusId) payload.statusId = statusId;
  if (row.dueDate) payload.dueDate = row.dueDate;
  if (row.storyPoints !== undefined) payload.storyPoints = row.storyPoints;
  if (assigneeIds.length) {
    payload.assigneeIds = assigneeIds;
    payload.assigneeId = assigneeIds[0];
  }
  if (row.tags.length) {
    payload.tags = row.tags.map((name) => ({
      name: name.slice(0, 80),
      color: DEFAULT_TAG_COLOR,
    }));
  }
  if (row.subtasks.length) {
    payload.subtasks = row.subtasks.map((s) => ({
      title: s.title.slice(0, 200),
      completed: s.completed,
      priority: "MEDIUM",
    }));
  }

  return payload;
}

export interface ImportTasksResult {
  created: number;
  failed: Array<{ row: number; title: string; error: string }>;
}

export async function importTasksFromCsv(
  rows: ParsedTaskCsvRow[],
  options: {
    projectId: string;
    organizationId: string;
    context: ImportTasksCsvContext;
    createTask: (payload: CreateTaskPayload) => Promise<unknown>;
    onProgress?: (done: number, total: number) => void;
  },
): Promise<ImportTasksResult> {
  const { projectId, organizationId, context, createTask, onProgress } = options;
  const failed: ImportTasksResult["failed"] = [];
  let created = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const payload = mapParsedRowToCreatePayload(
        row,
        context,
        projectId,
        organizationId,
      );
      await createTask(payload);
      created++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      failed.push({ row: row.rowNumber, title: row.title, error: message });
    }
    onProgress?.(i + 1, rows.length);
  }

  return { created, failed };
}
