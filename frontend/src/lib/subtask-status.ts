import type { SubtaskCompletionRecord, TaskSubtask } from "@/types/api";

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

function lightweightCompletionStamp(actor?: {
  id?: string;
  name?: string;
}): SubtaskCompletionRecord {
  return {
    completedAt: new Date().toISOString(),
    employeeId: actor?.id ?? "",
    employeeName: actor?.name ?? "",
    latitude: 0,
    longitude: 0,
    geofenceValid: false,
    deviceInfo: { source: "web" },
  };
}

export function subtaskWithStatus<
  T extends Pick<TaskSubtask, "status" | "completed"> & {
    completionRecord?: TaskSubtask["completionRecord"];
  },
>(subtask: T, status: SubtaskStatus, actor?: { id?: string; name?: string }): T {
  const next: T = {
    ...subtask,
    status,
    completed: status === "DONE",
  };
  if (status === "DONE") {
    return {
      ...next,
      completionRecord: subtask.completionRecord ?? lightweightCompletionStamp(actor),
    };
  }
  return {
    ...next,
    completionRecord: null,
  };
}

export function subtaskWithCompleted<
  T extends Pick<TaskSubtask, "status" | "completed"> & {
    completionRecord?: TaskSubtask["completionRecord"];
  },
>(subtask: T, completed: boolean, actor?: { id?: string; name?: string }): T {
  const current = resolveSubtaskStatus(subtask);
  const status: SubtaskStatus = completed
    ? "DONE"
    : current === "DONE"
      ? "TODO"
      : current;
  return subtaskWithStatus(subtask, status, actor);
}
