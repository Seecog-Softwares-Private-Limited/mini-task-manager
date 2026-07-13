import { resolveSubtaskStatus, type SubtaskStatus } from "@/lib/subtask-status";

export function parseDueDateLocal(value?: string): Date | null {
  if (!value) return null;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isSubtaskOverdue(
  dueDate?: string,
  options?: {
    dueTime?: string;
    completed?: boolean;
    status?: SubtaskStatus | string;
  }
): boolean {
  if (!dueDate) return false;
  if (options?.completed || resolveSubtaskStatus(options ?? {}) === "DONE") {
    return false;
  }

  const due = parseDueDateLocal(dueDate);
  if (!due) return false;

  if (options?.dueTime) {
    const [hRaw, mRaw] = options.dueTime.split(":");
    const hours = Number(hRaw);
    const minutes = Number(mRaw);
    if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
      due.setHours(hours, minutes, 0, 0);
      return due.getTime() < Date.now();
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return due < today;
}
