import { apiClient } from "@/services/api/client";
import type {
  RecurringTaskOccurrence,
  RecurringTaskSummary,
  RecurringTemplateSummary,
  Task,
  TaskRecurrenceConfig,
} from "@/types/api";

export interface RecurringBoardResponse {
  tasks: Task[];
  overdueTaskIds: string[];
}

export async function fetchRecurringBoard(
  projectId: string,
  statusIds: string[]
): Promise<RecurringBoardResponse> {
  const { data } = await apiClient.get<RecurringBoardResponse>("/recurring-tasks/board", {
    params: {
      projectId,
      statusIds: statusIds.length ? statusIds.join(",") : undefined,
    },
  });
  return data;
}

export async function syncRecurringBoard(projectId: string): Promise<{ materialized: number; repaired: number }> {
  const { data } = await apiClient.post<{ materialized: number; repaired: number }>(
    "/recurring-tasks/sync",
    {},
    { params: { projectId } }
  );
  return data;
}

export async function fetchRecurringSummary(projectId?: string): Promise<RecurringTaskSummary> {
  const { data } = await apiClient.get<RecurringTaskSummary>("/recurring-tasks/summary", {
    params: projectId ? { projectId } : undefined,
  });
  return data;
}

export async function fetchRecurringTemplates(params?: {
  projectId?: string;
  tab?: "UPCOMING" | "OVERDUE" | "TEMPLATES" | "COMPLETED_HISTORY";
}): Promise<RecurringTemplateSummary[]> {
  const { data } = await apiClient.get<RecurringTemplateSummary[]>("/recurring-tasks", {
    params,
  });
  return data ?? [];
}

export async function fetchRecurringTemplateHistory(
  templateId: string
): Promise<RecurringTaskOccurrence[]> {
  const { data } = await apiClient.get<RecurringTaskOccurrence[]>(
    `/recurring-tasks/${templateId}/history`
  );
  return data ?? [];
}

export async function pauseRecurringTemplate(templateId: string): Promise<void> {
  await apiClient.post(`/recurring-tasks/${templateId}/pause`);
}

export async function resumeRecurringTemplate(templateId: string): Promise<void> {
  await apiClient.post(`/recurring-tasks/${templateId}/resume`);
}

export async function archiveRecurringTemplate(templateId: string): Promise<void> {
  await apiClient.post(`/recurring-tasks/${templateId}/archive`);
}

export async function skipNextRecurringOccurrence(templateId: string): Promise<void> {
  await apiClient.post(`/recurring-tasks/${templateId}/skip-next`, { steps: 1 });
}

export async function deleteRecurringSeries(templateId: string): Promise<void> {
  await apiClient.delete(`/recurring-tasks/${templateId}`);
}

/** Delete one planner run so board sync cannot rematerialize it. */
export async function deleteRecurringRun(taskId: string): Promise<void> {
  try {
    await apiClient.delete(`/recurring-tasks/tasks/${taskId}`);
    return;
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status !== 404) throw err;
  }

  // Older VPS without DELETE /recurring-tasks/tasks/:id — mark DONE then delete task.
  const { data: task } = await apiClient.get<{
    projectId?: string;
    statusId?: string;
  }>(`/tasks/${taskId}`);
  const projectId = task.projectId;
  if (!projectId) {
    await apiClient.delete(`/tasks/${taskId}`);
    return;
  }

  const { data: workflows } = await apiClient.get<Array<{ id: string }>>(
    `/workflows/project/${projectId}`
  );
  let doneStatusId: string | undefined;
  for (const workflow of workflows ?? []) {
    const { data: statuses } = await apiClient.get<
      Array<{ id: string; type?: string }>
    >(`/workflows/${workflow.id}/statuses`);
    const done = (statuses ?? []).find(
      (s) => String(s.type ?? "").toUpperCase() === "DONE"
    );
    if (done?.id) {
      doneStatusId = done.id;
      break;
    }
  }
  if (doneStatusId) {
    await apiClient.patch(`/tasks/${taskId}`, { statusId: doneStatusId });
  }
  try {
    await apiClient.delete(`/tasks/${taskId}`);
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 403 && doneStatusId) return;
    throw err;
  }
}

export async function duplicateRecurringTemplate(
  templateId: string
): Promise<{ id: string; success: boolean }> {
  const { data } = await apiClient.post<{ id: string; success: boolean }>(
    `/recurring-tasks/${templateId}/duplicate`
  );
  return data;
}

export async function updateRecurringTemplate(
  templateId: string,
  payload: {
    title?: string;
    description?: string;
    priority?: string;
    assigneeIds?: string[];
    recurrence?: TaskRecurrenceConfig;
    subtasks?: Array<{
      id?: string;
      title: string;
      completed?: boolean;
      dueTime?: string;
      dueOffsetDays?: number;
      priority?: string;
      status?: string;
    }>;
  }
): Promise<RecurringTemplateSummary> {
  const { data } = await apiClient.patch<RecurringTemplateSummary>(
    `/recurring-tasks/${templateId}`,
    payload
  );
  return data;
}

export async function completeRecurringTaskWithAction(
  taskId: string,
  payload: {
    action:
      | "ONLY_THIS"
      | "THIS_AND_PREVIOUS_PENDING"
      | "STOP_SERIES_PERMANENTLY";
    doneStatusId?: string;
  }
): Promise<void> {
  await apiClient.post(`/recurring-tasks/tasks/${taskId}/complete`, payload);
}

export async function ensureRecurringOccurrenceSubtasks(taskId: string): Promise<Task> {
  const { data } = await apiClient.post<Task>(
    `/recurring-tasks/tasks/${taskId}/ensure-subtasks`
  );
  return data;
}

