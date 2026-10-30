import { apiClient } from "@/services/api/client";
import type { Issue, IssueSeverity, IssueStatus } from "@/types/api";

export interface CreateIssuePayload {
  projectId: string;
  siteId?: string;
  taskId?: string;
  subtaskId?: string;
  title: string;
  description?: string;
  severity?: IssueSeverity;
  assigneeId?: string;
}

export interface UpdateIssuePayload {
  title?: string;
  description?: string;
  severity?: IssueSeverity;
  status?: IssueStatus;
  /** Omit to leave unchanged; send "" to clear the assignee */
  assigneeId?: string;
  resolutionNote?: string;
}

export async function fetchIssues(filters?: {
  projectId?: string;
  status?: IssueStatus;
}): Promise<Issue[]> {
  const { data } = await apiClient.get<Issue[]>("/issues", { params: filters });
  return data;
}

export async function fetchIssue(id: string): Promise<Issue | null> {
  const { data } = await apiClient.get<Issue | null>(`/issues/${id}`);
  return data;
}

export async function createIssue(payload: CreateIssuePayload): Promise<Issue> {
  const { data } = await apiClient.post<Issue>("/issues", payload);
  return data;
}

export async function updateIssue(id: string, payload: UpdateIssuePayload): Promise<Issue> {
  const { data } = await apiClient.patch<Issue>(`/issues/${id}`, payload);
  return data;
}
