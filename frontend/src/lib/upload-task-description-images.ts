import { uploadAttachment } from "@/services/api/attachments.api";
import type { CreateTaskPayload } from "@/services/api/tasks.api";
import { createTask } from "@/services/api/tasks.api";
import { isValidTaskId } from "@/lib/task-id";
import { parseApiError } from "@/services/api/client";
import type { Task } from "@/types/api";

export type CreateTaskWithImagesInput = {
  payload: CreateTaskPayload;
  imageFiles?: File[];
};

export type CreateTaskWithImagesResult = {
  task: Task;
  /** Set when the task was saved but one or more image uploads failed. */
  imageUploadWarning?: string;
};

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
  imageFiles?: File[]
): Promise<CreateTaskWithImagesResult> {
  const task = await createTask(payload);

  if (!isValidTaskId(task?.id)) {
    throw new Error("Task was created but the server returned an invalid task id.");
  }

  if (!imageFiles?.length) {
    return { task };
  }

  const results = await Promise.allSettled(
    imageFiles.map((file) => uploadAttachment(task.id, file))
  );
  const failures = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];

  if (failures.length === 0) {
    return { task };
  }

  const firstReason = failures[0]?.reason;
  const detail =
    firstReason != null ? parseApiError(firstReason) : "Upload failed";

  if (failures.length === imageFiles.length) {
    return {
      task,
      imageUploadWarning: `Task created, but ${failures.length} pasted image(s) could not be uploaded. ${detail}`,
    };
  }

  return {
    task,
    imageUploadWarning: `Task created; ${failures.length} of ${imageFiles.length} pasted image(s) failed to upload. ${detail}`,
  };
}
