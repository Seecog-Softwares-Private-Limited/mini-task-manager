import { apiClient } from "@/services/api/client";

export interface TimeEntry {
  id: string;
  taskId: string;
  minutes: number;
  note: string | null;
  loggedAt: string;
  userId: string;
}

export async function fetchTimeEntries(taskId: string): Promise<TimeEntry[]> {
  const { data } = await apiClient.get<TimeEntry[]>(`/tasks/${taskId}/time-entries`);
  return data;
}

export async function logTaskTime(
  taskId: string,
  payload: { minutes: number; note?: string }
): Promise<TimeEntry> {
  const { data } = await apiClient.post<TimeEntry>(`/tasks/${taskId}/time-entries`, payload);
  return data;
}
