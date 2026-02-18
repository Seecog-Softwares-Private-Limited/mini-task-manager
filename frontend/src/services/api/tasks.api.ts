import { apiClient } from "@/services/api/client";
import type { Task } from "@/types/api";
import type { PaginatedResult } from "@/types/api";
import type { TaskSubtask } from "@/types/api";

/**
 * Backend CreateTaskDto accepted fields:
 *   projectId, organizationId, title, description, statusId, priority,
 *   assigneeId, assigneeIds, parentTaskId, sprintId, subtasks
 *
 * storyPoints and dueDate are NOT accepted on create or update
 * by the current backend. They are kept in the payload type for
 * forward-compatibility but silently stripped before sending.
 */
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
    Pick<TaskSubtask, "title" | "completed" | "assigneeId" | "dueDate" | "priority"> & {
      id?: string;
    }
  >;
  tags?: Array<{ name: string; color: string }>;
  /** Not supported by backend yet — kept for UI, stripped before send */
  storyPoints?: number;
  /** Not supported by backend yet — kept for UI, stripped before send */
  dueDate?: string;
}

export async function createTask(payload: CreateTaskPayload): Promise<Task> {
  const { storyPoints: _sp, dueDate: _dd, ...body } = payload;
  const { data } = await apiClient.post<Task>("/tasks", body);
  return data;
}

export async function fetchTasksByProject(
  projectId: string,
  page = 1,
  limit = 100
): Promise<PaginatedResult<Task>> {
  // Backend paginated DTO enforces numeric bounds; keep requests in safe range.
  const safePage = Number.isFinite(page) ? Math.max(1, Math.trunc(page)) : 1;
  const safeLimit = Number.isFinite(limit)
    ? Math.min(100, Math.max(1, Math.trunc(limit)))
    : 100;

  const { data } = await apiClient.get<PaginatedResult<Task>>(`/tasks/project/${projectId}`, {
    params: { page: safePage, limit: safeLimit },
  });
  return data;
}

/**
 * Backend PatchTaskDto accepts: title, description, statusId, assigneeId, storyPoints, tags, subtasks.
 */
export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  statusId?: string | null;
  priority?: string;
  assigneeId?: string | null;
  dueDate?: string | null;
  storyPoints?: number | null;
  tags?: Array<{ name: string; color: string }>;
  subtasks?: TaskSubtask[];
}

export async function updateTask(
  taskId: string,
  payload: UpdateTaskPayload
): Promise<Task> {
  const body: Record<string, unknown> = {};
  if (payload.title !== undefined) body.title = payload.title;
  if (payload.description !== undefined) body.description = payload.description;
  if (payload.statusId !== undefined) body.statusId = payload.statusId;
  if (payload.assigneeId !== undefined) body.assigneeId = payload.assigneeId;
  if (payload.storyPoints !== undefined) body.storyPoints = payload.storyPoints;
  if (payload.tags !== undefined) body.tags = payload.tags;
  if (payload.subtasks !== undefined) body.subtasks = payload.subtasks;
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

export async function updateTaskAssignee(
  taskId: string,
  assigneeId: string | null
): Promise<Task> {
  const { data } = await apiClient.patch<Task>(`/tasks/${taskId}/assignee`, { assigneeId });
  return data;
}

export async function fetchTask(taskId: string): Promise<Task> {
  const { data } = await apiClient.get<Task>(`/tasks/${taskId}`);
  return data;
}
