import { apiClient } from "@/services/api/client";
import type { TaskComment } from "@/types/api";

export async function fetchComments(taskId: string): Promise<TaskComment[]> {
  const { data } = await apiClient.get<TaskComment[]>(`/tasks/${taskId}/comments`);
  return data;
}

export async function addComment(taskId: string, text: string): Promise<TaskComment> {
  const { data } = await apiClient.post<TaskComment>(`/tasks/${taskId}/comments`, {
    body: text,
  });
  return data;
}

export async function deleteComment(
  taskId: string,
  commentId: string
): Promise<void> {
  await apiClient.delete(`/tasks/${taskId}/comments/${commentId}`);
}

/**
 * Fetch comment counts for multiple tasks in parallel.
 * Returns a map of taskId -> comment count.
 * Fails silently per-task to avoid breaking the board.
 */
export async function fetchCommentCounts(
  taskIds: string[]
): Promise<Record<string, number>> {
  if (taskIds.length === 0) return {};
  const results = await Promise.allSettled(
    taskIds.map(async (id) => {
      const comments = await fetchComments(id);
      return { id, count: comments.length };
    })
  );
  const map: Record<string, number> = {};
  for (const r of results) {
    if (r.status === "fulfilled") {
      map[r.value.id] = r.value.count;
    }
  }
  return map;
}
