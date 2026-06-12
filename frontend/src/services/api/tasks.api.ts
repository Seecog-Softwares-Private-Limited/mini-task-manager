import { apiClient } from "@/services/api/client";
import { normalizeTaskId } from "@/lib/task-id";
import type { Task } from "@/types/api";
import type { PaginatedResult } from "@/types/api";
import { resolveSubtaskStatus } from "@/lib/subtask-status";
import type { TaskSubtask } from "@/types/api";
import type { TaskRecurrenceConfig } from "@/types/api";
import { clampSubtaskTitle } from "@/lib/subtask-limits";

/** Fields accepted by backend CreateTaskDto. */
export interface CreateTaskPayload {
  projectId: string;
  organizationId: string;
  title: string;
  description?: string;
  statusId?: string;
  priority?: string;
  assigneeId?: string;
  assigneeIds?: string[];
  parentTaskId?: string;
  sprintId?: string;
  subtasks?: Array<
    Pick<
      TaskSubtask,
      "title" | "completed" | "description" | "assigneeId" | "dueDate" | "priority" | "statusId"
    > & {
      id?: string;
    }
  >;
  tags?: Array<{ name: string; color: string }>;
  storyPoints?: number;
  dueDate?: string;
  recurrence?: TaskRecurrenceConfig;
}

/** Backend PatchTaskSubtaskDto only accepts whitelisted fields with strict formats. */
export function serializeSubtasksForApi(subtasks: TaskSubtask[]): TaskSubtask[] {
  return subtasks.map((s) => {
    const item: TaskSubtask = {
      id: s.id,
      title: clampSubtaskTitle(String(s.title ?? "").trim()),
      completed: Boolean(s.completed),
    };
    if (s.description?.trim()) item.description = s.description.trim();
    if (s.assigneeId) item.assigneeId = s.assigneeId;
    const status = resolveSubtaskStatus(s);
    item.status = status;
    item.completed = status === "DONE";
    if (s.dueDate) {
      const match = String(s.dueDate).match(/^(\d{4}-\d{2}-\d{2})/);
      if (match) item.dueDate = match[1];
    }
    return item;
  });
}

export async function createTask(payload: CreateTaskPayload): Promise<Task> {
  const body = { ...payload };
  if (body.dueDate) {
    const match = String(body.dueDate).match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) body.dueDate = match[1];
    else delete body.dueDate;
  } else {
    delete body.dueDate;
  }
  if (body.storyPoints === undefined || body.storyPoints === null) {
    delete body.storyPoints;
  }
  if (body.subtasks?.length) {
    body.subtasks = serializeSubtasksForApi(body.subtasks as TaskSubtask[]);
  }
  const { data } = await apiClient.post<Task>("/tasks", body);
  const id = normalizeTaskId(data?.id);
  if (!id) return data;
  return { ...data, id };
}

export interface FetchTasksByProjectOptions {
  /** Pass when fetching tasks for a project in a different org (e.g. org dashboard). */
  organizationId?: string;
}

export async function fetchTasksByProject(
  projectId: string,
  page = 1,
  limit = 100,
  options?: FetchTasksByProjectOptions
): Promise<PaginatedResult<Task>> {
  // Backend paginated DTO enforces numeric bounds; keep requests in safe range.
  const safePage = Number.isFinite(page) ? Math.max(1, Math.trunc(page)) : 1;
  const safeLimit = Number.isFinite(limit)
    ? Math.min(100, Math.max(1, Math.trunc(limit)))
    : 100;

  const headers = options?.organizationId
    ? { "X-Organization-Id": options.organizationId }
    : undefined;

  const { data } = await apiClient.get<PaginatedResult<Task>>(`/tasks/project/${projectId}`, {
    params: { page: safePage, limit: safeLimit },
    ...(headers && { headers }),
  });
  return data;
}

/**
 * Backend PatchTaskDto accepts: title, description, statusId, assigneeId, dueDate, priority, storyPoints, tags, subtasks.
 */
export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  statusId?: string | null;
  sprintId?: string | null;
  priority?: string;
  assigneeId?: string | null;
  assigneeIds?: string[];
  dueDate?: string | null;
  storyPoints?: number | null;
  tags?: Array<{ name: string; color: string }>;
  subtasks?: TaskSubtask[];
  recurrence?: TaskRecurrenceConfig;
}

export async function updateTask(
  taskId: string,
  payload: UpdateTaskPayload
): Promise<Task> {
  const body: Record<string, unknown> = {};
  if (payload.title !== undefined) body.title = payload.title;
  if (payload.description !== undefined) body.description = payload.description;
  if (payload.statusId !== undefined) body.statusId = payload.statusId;
  if (payload.sprintId !== undefined) body.sprintId = payload.sprintId;
  if (payload.assigneeId !== undefined) body.assigneeId = payload.assigneeId;
  if (payload.assigneeIds !== undefined) body.assigneeIds = payload.assigneeIds;
  if (payload.dueDate !== undefined) body.dueDate = payload.dueDate;
  if (payload.priority !== undefined) body.priority = payload.priority;
  if (payload.storyPoints !== undefined) body.storyPoints = payload.storyPoints;
  if (payload.tags !== undefined) body.tags = payload.tags;
  if (payload.subtasks !== undefined) {
    body.subtasks = serializeSubtasksForApi(payload.subtasks);
  }
  if (payload.recurrence !== undefined) body.recurrence = payload.recurrence;
  const { data } = await apiClient.patch<Task>(`/tasks/${taskId}`, body);
  return data;
}

export async function updateTaskStatus(
  taskId: string,
  statusId: string | null
): Promise<Task | null> {
  const { data } = await apiClient.patch<Task | null>(`/tasks/${taskId}`, { statusId });
  return data;
}

/** Update task status and/or sprint (for Scrum board moves). */
export async function updateTaskStatusAndSprint(
  taskId: string,
  statusId: string,
  sprintId: string | null
): Promise<Task | null> {
  const { data } = await apiClient.patch<Task | null>(`/tasks/${taskId}`, {
    statusId,
    sprintId,
  });
  return data;
}

export async function updateTaskAssignee(
  taskId: string,
  assigneeId: string | null
): Promise<Task> {
  const { data } = await apiClient.patch<Task>(`/tasks/${taskId}/assignee`, { assigneeId });
  return data;
}

export async function updateTaskAssignees(
  taskId: string,
  assigneeIds: string[]
): Promise<Task> {
  const { data } = await apiClient.patch<Task>(`/tasks/${taskId}/assignee`, { assigneeIds });
  return data;
}

export async function fetchTask(taskId: string): Promise<Task> {
  const { data } = await apiClient.get<Task>(`/tasks/${taskId}`);
  return data;
}

export async function deleteTask(taskId: string): Promise<void> {
  await apiClient.delete(`/tasks/${taskId}`);
}
