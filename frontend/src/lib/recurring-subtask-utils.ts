import type { Task, TaskSubtask } from "@/types/api";
import { resolveSubtaskStatus } from "@/lib/subtask-status";

export interface OccurrenceSubtaskProgress {
  total: number;
  completed: number;
}

export function getOccurrenceSubtaskProgress(
  subtasks?: TaskSubtask[] | null
): OccurrenceSubtaskProgress {
  const list = subtasks ?? [];
  const completed = list.filter(
    (s) => s.completed || resolveSubtaskStatus(s) === "DONE"
  ).length;
  return { total: list.length, completed };
}

export function computeOccurrenceSubtaskMap(
  tasks: Task[]
): Record<string, OccurrenceSubtaskProgress> {
  const map: Record<string, OccurrenceSubtaskProgress> = {};
  for (const task of tasks) {
    const progress = getOccurrenceSubtaskProgress(task.subtasks);
    if (progress.total > 0) {
      map[task.id] = progress;
    }
  }
  return map;
}

export function allOccurrenceSubtasksDone(subtasks?: TaskSubtask[] | null): boolean {
  const { total, completed } = getOccurrenceSubtaskProgress(subtasks);
  return total === 0 || completed === total;
}

export function formatSubtaskProgressLabel(progress: OccurrenceSubtaskProgress): string {
  return `${progress.completed}/${progress.total}`;
}
