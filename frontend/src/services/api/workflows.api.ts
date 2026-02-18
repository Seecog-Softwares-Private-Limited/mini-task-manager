import { apiClient } from "@/services/api/client";
import type { Workflow, WorkflowStatus } from "@/types/api";

export async function fetchWorkflowsByProject(projectId: string): Promise<Workflow[]> {
  const { data } = await apiClient.get<Workflow[]>(`/workflows/project/${projectId}`);
  return data;
}

export async function fetchWorkflowStatuses(workflowId: string): Promise<WorkflowStatus[]> {
  const { data } = await apiClient.get<WorkflowStatus[]>(`/workflows/${workflowId}/statuses`);
  return data;
}

export async function createDefaultWorkflow(projectId: string): Promise<Workflow> {
  const { data } = await apiClient.post<Workflow>(`/workflows/project/${projectId}/default`);
  return data;
}
