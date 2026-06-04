import { apiClient } from "@/services/api/client";
import { config } from "@/config/env";
import type { TaskAttachment } from "@/types/api";

/** Backend returns fileUrl (relative path); we expose a download URL. */
export interface TaskAttachmentResponse {
  id: string;
  taskId: string;
  fileName: string | null;
  fileUrl: string;
  uploadedBy: string;
  uploadedAt: string;
}

function toAttachment(r: TaskAttachmentResponse): TaskAttachment {
  return {
    id: r.id,
    taskId: r.taskId,
    fileName: r.fileName ?? "file",
    fileSize: 0,
    mimeType: "",
    url: `${config.apiBaseUrl}/tasks/attachments/${r.id}/file`,
    uploadedBy: r.uploadedBy,
    uploadedAt: r.uploadedAt,
  };
}

/** Fetch attachment file bytes (for export). */
export async function fetchAttachmentBlob(attachmentId: string): Promise<Blob> {
  const { data } = await apiClient.get(`/tasks/attachments/${attachmentId}/file`, {
    responseType: "blob",
  });
  return data as Blob;
}

/** Fetch attachment bytes with auth and return a blob URL for preview. Caller must revoke when done. */
export async function fetchAttachmentPreviewUrl(attachmentId: string): Promise<string> {
  const url = URL.createObjectURL(await fetchAttachmentBlob(attachmentId));
  return url;
}

export async function fetchAttachments(taskId: string): Promise<TaskAttachment[]> {
  const { data } = await apiClient.get<TaskAttachmentResponse[]>(`/tasks/${taskId}/attachments`);
  return (data ?? []).map(toAttachment);
}

export async function uploadAttachment(taskId: string, file: File): Promise<TaskAttachment> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await apiClient.post<TaskAttachmentResponse>(`/tasks/${taskId}/attachments`, form);
  return toAttachment(data);
}

export async function deleteAttachment(
  taskId: string,
  attachmentId: string
): Promise<void> {
  await apiClient.delete(`/tasks/${taskId}/attachments/${attachmentId}`);
}

/** Download attachment with auth; triggers browser save. */
export async function downloadAttachment(
  attachmentId: string,
  fileName: string
): Promise<void> {
  const { data } = await apiClient.get(`/tasks/attachments/${attachmentId}/file`, {
    responseType: "blob",
  });
  const url = URL.createObjectURL(data as Blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName || "download";
  a.click();
  URL.revokeObjectURL(url);
}
