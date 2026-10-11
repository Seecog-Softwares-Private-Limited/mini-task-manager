import { apiClient } from "@/services/api/client";

export interface SubtaskSuggestion {
  title: string;
}

export interface SuggestSubtasksTaskRequest {
  taskId: string;
}

export interface SuggestSubtasksDraftRequest {
  draft: {
    title: string;
    description?: string;
    subtasks?: Array<{ title: string }>;
  };
}

export type SuggestSubtasksRequest =
  | (SuggestSubtasksTaskRequest & { excludeTitles?: string[] })
  | (SuggestSubtasksDraftRequest & { excludeTitles?: string[] });

export async function suggestSubtasks(
  body: SuggestSubtasksRequest
): Promise<{ suggestions: SubtaskSuggestion[] }> {
  const { data } = await apiClient.post<{ suggestions?: Array<{ title?: unknown }> }>(
    "/ai/subtask-suggestions",
    body
  );
  const suggestions = Array.isArray(data?.suggestions) ? data.suggestions : [];
  return {
    suggestions: suggestions
      .map((item) => (typeof item?.title === "string" ? item.title.trim() : ""))
      .filter((title) => title.length > 0)
      .map((title) => ({ title })),
  };
}
