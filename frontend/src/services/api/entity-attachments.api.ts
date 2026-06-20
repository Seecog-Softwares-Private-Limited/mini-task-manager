import { apiClient } from "@/services/api/client";
import { config } from "@/config/env";
import type { EntityAttachment, EntityAttachmentType } from "@/types/api";

interface EntityAttachmentResponse {
  id: string;
  workspaceId: string;
  projectId: string;
  taskId?: string | null;
  entityType: EntityAttachmentType;
  entityId: string;
  originalFileName: string | null;
  storedFileName: string;
  mimeType: string | null;
  fileExtension?: string | null;
  fileSize: number;
  storageProvider: string;
  thumbnailUrl?: string | null;
  previewUrl?: string | null;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

function toEntityAttachment(r: EntityAttachmentResponse): EntityAttachment {
  return {
    id: r.id,
    workspaceId: r.workspaceId,
    projectId: r.projectId,
    taskId: r.taskId,
    entityType: r.entityType,
    entityId: r.entityId,
    originalFileName: r.originalFileName ?? "file",
    storedFileName: r.storedFileName,
    mimeType: r.mimeType ?? "",
    fileExtension: r.fileExtension,
    fileSize: Number(r.fileSize ?? 0),
    storageProvider: r.storageProvider,
    thumbnailUrl: r.thumbnailUrl,
    previewUrl: r.previewUrl,
    uploadedBy: r.uploadedBy,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export function entityAttachmentDownloadUrl(id: string): string {
  return `${config.apiBaseUrl}/attachments/${id}/download`;
}

export function entityAttachmentPreviewUrl(id: string): string {
  return `${config.apiBaseUrl}/attachments/${id}/preview`;
}

export async function fetchEntityAttachments(
  entityType: EntityAttachmentType,
  entityId: string,
  taskId?: string
): Promise<EntityAttachment[]> {
  const { data } = await apiClient.get<EntityAttachmentResponse[]>(
    `/attachments/entity/${entityType}/${entityId}`,
    { params: taskId ? { taskId } : undefined }
  );
  return (data ?? []).map(toEntityAttachment);
}

export async function uploadEntityAttachment(
  entityType: EntityAttachmentType,
  entityId: string,
  file: File,
  taskId?: string
): Promise<EntityAttachment> {
  const form = new FormData();
  form.append("file", file);
  form.append("entityType", entityType);
  form.append("entityId", entityId);
  if (taskId) form.append("taskId", taskId);
  const { data } = await apiClient.post<EntityAttachmentResponse>("/attachments/upload", form);
  return toEntityAttachment(data);
}

export async function deleteEntityAttachment(attachmentId: string): Promise<void> {
  await apiClient.delete(`/attachments/${attachmentId}`);
}

export interface RenderedOfficePreview {
  format: "html";
  content: string;
}

export async function fetchEntityAttachmentRenderedPreview(
  attachmentId: string
): Promise<RenderedOfficePreview> {
  const { data } = await apiClient.get<RenderedOfficePreview>(
    `/attachments/${attachmentId}/preview-rendered`
  );
  return data;
}

/** Returns null instead of throwing when server preview is unavailable. */
export async function tryFetchEntityAttachmentRenderedPreview(
  attachmentId: string
): Promise<RenderedOfficePreview | null> {
  try {
    return await fetchEntityAttachmentRenderedPreview(attachmentId);
  } catch {
    return null;
  }
}

export async function fetchEntityAttachmentBlob(attachmentId: string): Promise<Blob> {
  const { data } = await apiClient.get(`/attachments/${attachmentId}/download`, {
    responseType: "blob",
  });
  return data as Blob;
}

export async function fetchEntityAttachmentPreviewBlob(attachmentId: string): Promise<Blob> {
  const { data } = await apiClient.get(`/attachments/${attachmentId}/preview`, {
    responseType: "blob",
  });
  return data as Blob;
}

export async function downloadEntityAttachment(
  attachmentId: string,
  fileName: string
): Promise<void> {
  const blob = await fetchEntityAttachmentBlob(attachmentId);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName || "download";
  a.click();
  URL.revokeObjectURL(url);
}
