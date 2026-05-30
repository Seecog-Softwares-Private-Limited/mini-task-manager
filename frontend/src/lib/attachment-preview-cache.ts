import { fetchAttachmentPreviewUrl } from "@/services/api/attachments.api";

type CacheEntry = {
  url: string;
  refCount: number;
};

const previewCache = new Map<string, CacheEntry>();

export async function getCachedAttachmentPreviewUrl(attachmentId: string): Promise<string> {
  const existing = previewCache.get(attachmentId);
  if (existing) {
    existing.refCount += 1;
    return existing.url;
  }

  const url = await fetchAttachmentPreviewUrl(attachmentId);
  previewCache.set(attachmentId, { url, refCount: 1 });
  return url;
}

export function releaseCachedAttachmentPreviewUrl(attachmentId: string) {
  const entry = previewCache.get(attachmentId);
  if (!entry) return;
  entry.refCount -= 1;
  if (entry.refCount <= 0) {
    URL.revokeObjectURL(entry.url);
    previewCache.delete(attachmentId);
  }
}

export function releaseCachedAttachmentPreviewUrls(attachmentIds: string[]) {
  for (const id of attachmentIds) {
    releaseCachedAttachmentPreviewUrl(id);
  }
}
