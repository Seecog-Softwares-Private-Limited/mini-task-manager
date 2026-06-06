import { uploadAttachment } from "@/services/api/attachments.api";
import type { CreateTaskPayload } from "@/services/api/tasks.api";
import { createTask } from "@/services/api/tasks.api";
import { isValidTaskId, normalizeTaskId } from "@/lib/task-id";
import { parseApiError } from "@/services/api/client";
import type { Task } from "@/types/api";
import {
  uploadSubtaskAttachmentsAfterCreate,
  type SubtaskPendingUploadMap,
} from "@/lib/upload-subtask-attachments";

export type CreateTaskWithImagesInput = {
  payload: CreateTaskPayload;
  imageFiles?: File[];
  subtaskPendingAttachments?: SubtaskPendingUploadMap;
  taskAttachmentFiles?: File[];
};

export type CreateTaskWithImagesResult = {
  task: Task;
  /** Set when the task was saved but one or more image uploads failed. */
  imageUploadWarning?: string;
  taskAttachmentWarning?: string;
  subtaskUploadWarning?: string;
};

async function uploadFilesWithWarning(
  files: File[],
  upload: (file: File) => Promise<unknown>,
  allFailedMessage: (count: number, detail: string) => string,
  partialFailedMessage: (failed: number, total: number, detail: string) => string
): Promise<string | undefined> {
  if (!files.length) return undefined;

  const results = await Promise.allSettled(files.map((file) => upload(file)));
  const failures = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];

  if (!failures.length) return undefined;

  const firstDetail = parseApiError(failures[0]?.reason);
  if (failures.length === files.length) {
    return allFailedMessage(failures.length, firstDetail);
  }
  return partialFailedMessage(failures.length, files.length, firstDetail);
}

export async function uploadTaskDescriptionImages(
  taskId: string,
  files: File[]
): Promise<void> {
  if (!files.length) return;
  if (!isValidTaskId(taskId)) {
    throw new Error("Cannot upload images: invalid task id.");
  }
  await Promise.all(files.map((file) => uploadAttachment(taskId, file)));
}

export async function createTaskWithDescriptionImages(
  payload: CreateTaskPayload,
  imageFiles?: File[],
  subtaskPendingAttachments?: SubtaskPendingUploadMap,
  taskAttachmentFiles?: File[]
): Promise<CreateTaskWithImagesResult> {
  const created = await createTask(payload);
  const taskId = normalizeTaskId(created?.id) ?? created?.id;
  const task = taskId && taskId !== created?.id ? { ...created, id: taskId } : created;

  if (!isValidTaskId(task?.id)) {
    throw new Error("Task was created but the server returned an invalid task id.");
  }

  let imageUploadWarning: string | undefined;
  let taskAttachmentWarning: string | undefined;
  let subtaskUploadWarning: string | undefined;

  if (imageFiles?.length) {
    imageUploadWarning = await uploadFilesWithWarning(
      imageFiles,
      (file) => uploadAttachment(task.id, file),
      (count, detail) =>
        `Task created, but ${count} pasted image(s) could not be uploaded. ${detail}`,
      (failed, total, detail) =>
        `Task created; ${failed} of ${total} pasted image(s) failed to upload. ${detail}`
    );
  }

  if (taskAttachmentFiles?.length) {
    taskAttachmentWarning = await uploadFilesWithWarning(
      taskAttachmentFiles,
      (file) => uploadAttachment(task.id, file),
      (count, detail) =>
        `Task created, but ${count} task file(s) could not be uploaded. ${detail}`,
      (failed, total, detail) =>
        `Task created; ${failed} of ${total} task file(s) failed to upload. ${detail}`
    );
  }

  if (subtaskPendingAttachments && Object.keys(subtaskPendingAttachments).length > 0) {
    subtaskUploadWarning = await uploadSubtaskAttachmentsAfterCreate(
      task,
      subtaskPendingAttachments
    );
  }

  if (!imageUploadWarning && !taskAttachmentWarning && !subtaskUploadWarning) {
    return { task };
  }

  return { task, imageUploadWarning, taskAttachmentWarning, subtaskUploadWarning };
}
