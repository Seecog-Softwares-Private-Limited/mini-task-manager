import { uploadAttachment } from "@/services/api/attachments.api";
import type { CreateTaskPayload } from "@/services/api/tasks.api";
import { createTask } from "@/services/api/tasks.api";
import type { Task } from "@/types/api";

export type CreateTaskWithImagesInput = {
  payload: CreateTaskPayload;
  imageFiles?: File[];
};

export async function uploadTaskDescriptionImages(
  taskId: string,
  files: File[]
): Promise<void> {
  if (!files.length) return;
  await Promise.all(files.map((file) => uploadAttachment(taskId, file)));
}

export async function createTaskWithDescriptionImages(
  payload: CreateTaskPayload,
  imageFiles?: File[]
): Promise<Task> {
  const task = await createTask(payload);
  if (imageFiles?.length) {
    await uploadTaskDescriptionImages(task.id, imageFiles);
  }
  return task;
}
