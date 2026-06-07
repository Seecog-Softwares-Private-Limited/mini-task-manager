import { apiClient } from "@/services/api/client";
import type {
  RecurringTaskOccurrence,
  RecurringTaskSummary,
  RecurringTemplateSummary,
  TaskRecurrenceConfig,
} from "@/types/api";

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

export async function skipNextRecurringOccurrence(templateId: string): Promise<void> {
  await apiClient.post(`/recurring-tasks/${templateId}/skip-next`, { steps: 1 });
}

export async function deleteRecurringSeries(templateId: string): Promise<void> {
  await apiClient.delete(`/recurring-tasks/${templateId}`);
}

export async function updateRecurringTemplate(
  templateId: string,
  payload: { title?: string; recurrence?: TaskRecurrenceConfig }
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

