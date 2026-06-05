const EXT_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".bmp": "image/bmp",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".csv": "text/csv",
  ".json": "application/json",
  ".zip": "application/zip",
};

/** Infer MIME from filename when ZIP blobs have no type (backend rejects octet-stream). */
export function guessMimeTypeFromFileName(fileName: string): string {
  const ext = fileName.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";
  return EXT_MIME[ext] ?? "application/octet-stream";
}

export function blobToTypedFile(blob: Blob, fileName: string): File {
  const type =
    blob.type && blob.type !== "application/octet-stream"
      ? blob.type
      : guessMimeTypeFromFileName(fileName);
  return new File([blob], fileName, { type });
}
