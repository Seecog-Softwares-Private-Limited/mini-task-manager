import {
  FileArchive,
  FileSpreadsheet,
  FileText,
  FileType,
  File as FileIcon,
  Image as ImageIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileExt(fileName?: string): string {
  return fileName?.split(".").pop()?.toLowerCase() ?? "";
}

/** Normalize blob type so browsers can preview PDFs/images from generic octet-stream responses. */
export function ensurePreviewBlob(
  blob: Blob,
  mimeType?: string,
  fileName?: string
): Blob {
  if (isPdfMime(mimeType, fileName)) {
    return blob.type === "application/pdf"
      ? blob
      : new Blob([blob], { type: "application/pdf" });
  }
  if (isImageMime(mimeType, fileName)) {
    const target =
      mimeType?.startsWith("image/") ? mimeType : inferMimeTypeFromFileName(fileName);
    return blob.type.startsWith("image/") ? blob : new Blob([blob], { type: target });
  }
  return blob;
}

/** Best-effort MIME from filename when the API omits mimeType. */
export function inferMimeTypeFromFileName(fileName?: string): string {
  const ext = fileExt(fileName);
  const map: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    bmp: "image/bmp",
    svg: "image/svg+xml",
    pdf: "application/pdf",
    txt: "text/plain",
    csv: "text/csv",
    json: "application/json",
    zip: "application/zip",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
  return map[ext] ?? "application/octet-stream";
}

export function isImageMime(mimeType?: string, fileName?: string): boolean {
  if (mimeType?.startsWith("image/")) return true;
  const ext = fileExt(fileName);
  return ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(ext);
}

export function isPdfMime(mimeType?: string, fileName?: string): boolean {
  if (mimeType === "application/pdf") return true;
  return fileExt(fileName) === "pdf";
}

/** Whether a local File can be previewed in-browser before upload. */
export function isLocallyPreviewableFile(file: File): boolean {
  return (
    isImageMime(file.type, file.name) ||
    isPdfMime(file.type, file.name) ||
    isTextPreviewMime(file.type, file.name)
  );
}

export function createLocalPreviewUrl(file: File): string | undefined {
  if (!isLocallyPreviewableFile(file)) return undefined;
  return URL.createObjectURL(file);
}

export function isTextPreviewMime(mimeType?: string, fileName?: string): boolean {
  if (!mimeType && fileName) {
    const ext = fileName.split(".").pop()?.toLowerCase();
    return ext === "csv" || ext === "json" || ext === "txt";
  }
  return (
    Boolean(mimeType?.startsWith("text/")) ||
    mimeType === "application/json" ||
    mimeType === "text/csv"
  );
}

export function getAttachmentFileIcon(
  mimeType?: string,
  fileName?: string
): { Icon: LucideIcon; label: string } {
  const ext = fileName?.split(".").pop()?.toLowerCase() ?? "";
  if (isImageMime(mimeType)) return { Icon: ImageIcon, label: "Image" };
  if (isPdfMime(mimeType)) return { Icon: FileText, label: "PDF" };
  if (
    mimeType?.includes("spreadsheet") ||
    mimeType?.includes("excel") ||
    ext === "xls" ||
    ext === "xlsx" ||
    ext === "csv"
  ) {
    return { Icon: FileSpreadsheet, label: "Spreadsheet" };
  }
  if (
    mimeType?.includes("word") ||
    ext === "doc" ||
    ext === "docx"
  ) {
    return { Icon: FileType, label: "Document" };
  }
  if (mimeType?.includes("zip") || ext === "zip") {
    return { Icon: FileArchive, label: "Archive" };
  }
  return { Icon: FileIcon, label: "File" };
}
