import { parseApiError } from "@/services/api/client";
import { uploadEntityAttachment } from "@/services/api/entity-attachments.api";
import type { Task } from "@/types/api";
import type { PendingSubtaskAttachment } from "@/components/tasks/subtasks/subtask-attachments-section";

export type SubtaskPendingUploadMap = Record<string, PendingSubtaskAttachment[]>;

export async function uploadSubtaskAttachmentsAfterCreate(
  task: Task,
  pendingBySubtaskId: SubtaskPendingUploadMap
): Promise<string | undefined> {
  const subtasks = task.subtasks ?? [];
  if (!subtasks.length) return undefined;

  const uploadJobs: Array<{ subtaskId: string; subtaskTitle: string; file: File }> = [];
  for (const subtask of subtasks) {
    const pending = pendingBySubtaskId[subtask.id] ?? [];
    for (const item of pending) {
      uploadJobs.push({
        subtaskId: subtask.id,
        subtaskTitle: subtask.title || "Untitled subtask",
        file: item.file,
      });
    }
  }

  if (!uploadJobs.length) return undefined;

  const results = await Promise.allSettled(
    uploadJobs.map(({ subtaskId, file }) =>
      uploadEntityAttachment("SUBTASK", subtaskId, file, task.id)
    )
  );

  const failures = results
    .map((result, index) => ({ result, job: uploadJobs[index]! }))
    .filter((entry) => entry.result.status === "rejected") as Array<{
    result: PromiseRejectedResult;
    job: (typeof uploadJobs)[number];
  }>;

  if (!failures.length) return undefined;

  const firstDetail = parseApiError(failures[0]?.result.reason);
  if (failures.length === uploadJobs.length) {
    return `Task created, but ${failures.length} subtask file(s) could not be uploaded. ${firstDetail}`;
  }

  const affectedSubtasks = Array.from(
    new Set(failures.map((entry) => entry.job.subtaskTitle))
  );
  return `Task created; ${failures.length} of ${uploadJobs.length} subtask file(s) failed to upload (${affectedSubtasks.join(", ")}). ${firstDetail}`;
}
