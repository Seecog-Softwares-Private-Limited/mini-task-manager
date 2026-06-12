import type { TaskSubtask } from "@/types/api";

export type SubtaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

export const SUBTASK_STATUS_VALUES: SubtaskStatus[] = ["TODO", "IN_PROGRESS", "DONE"];

export const SUBTASK_STATUS_OPTIONS: Array<{
  value: SubtaskStatus;
  label: string;
  dotClass: string;
}> = [
  { value: "TODO", label: "To Do", dotClass: "bg-blue-500" },
  { value: "IN_PROGRESS", label: "In Progress", dotClass: "bg-amber-500" },
  { value: "DONE", label: "Done", dotClass: "bg-violet-500" },
];

export function resolveSubtaskStatus(subtask: {
  status?: SubtaskStatus | string;
  completed?: boolean;
}): SubtaskStatus {
  const raw = subtask.status;
  if (raw && SUBTASK_STATUS_VALUES.includes(raw as SubtaskStatus)) {
    return raw as SubtaskStatus;
  }
  if (subtask.completed) return "DONE";
  return "TODO";
}

export function subtaskWithStatus<T extends Pick<TaskSubtask, "status" | "completed">>(
  subtask: T,
  status: SubtaskStatus
): T {
  return {
    ...subtask,
    status,
    completed: status === "DONE",
  };
}

export function subtaskWithCompleted<T extends Pick<TaskSubtask, "status" | "completed">>(
  subtask: T,
  completed: boolean
): T {
  const current = resolveSubtaskStatus(subtask);
  const status: SubtaskStatus = completed
    ? "DONE"
    : current === "DONE"
      ? "TODO"
      : current;
  return {
    ...subtask,
    status,
    completed,
  };
}
