import { apiClient } from "@/services/api/client";
import type { SubtaskComment, TaskComment } from "@/types/api";

export async function fetchComments(taskId: string): Promise<TaskComment[]> {
  const { data } = await apiClient.get<TaskComment[]>(`/tasks/${taskId}/comments`);
  return data;
}

export async function addComment(
  taskId: string,
  text: string,
  mentionedUserIds?: string[]
): Promise<TaskComment> {
  const { data } = await apiClient.post<TaskComment>(`/tasks/${taskId}/comments`, {
    body: text,
    mentionedUserIds: mentionedUserIds ?? [],
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

/** Checklist / planner notes (threaded subtask comments). */
export async function fetchSubtaskComments(
  taskId: string,
  subtaskId: string
): Promise<SubtaskComment[]> {
  const { data } = await apiClient.get<SubtaskComment[]>(
    `/tasks/${taskId}/subtasks/${subtaskId}/comments`
  );
  return Array.isArray(data) ? data : [];
}

export async function addSubtaskComment(
  taskId: string,
  subtaskId: string,
  body: string,
  parentId?: string | null
): Promise<SubtaskComment> {
  const { data } = await apiClient.post<SubtaskComment>(
    `/tasks/${taskId}/subtasks/${subtaskId}/comments`,
    {
      body,
      ...(parentId ? { parentId } : {}),
    }
  );
  return data;
}

export async function updateSubtaskComment(
  taskId: string,
  subtaskId: string,
  commentId: string,
  body: string
): Promise<SubtaskComment> {
  const { data } = await apiClient.patch<SubtaskComment>(
    `/tasks/${taskId}/subtasks/${subtaskId}/comments/${commentId}`,
    { body }
  );
  return data;
}

export async function deleteSubtaskComment(
  taskId: string,
  subtaskId: string,
  commentId: string
): Promise<void> {
  await apiClient.delete(
    `/tasks/${taskId}/subtasks/${subtaskId}/comments/${commentId}`
  );
}
