/** Matches backend task attachment limits (see tasks.service.ts). */
export const TASK_PASTE_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
  "image/bmp",
]);

export function getClipboardImageFile(data: DataTransfer | null): File | null {
  if (!data) return null;
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i];
    if (item.kind === "file" && item.type.startsWith("image/")) {
      const file = item.getAsFile();
      if (file) return file;
    }
  }
  return null;
}

export function validateTaskPasteImageFile(file: File): string | null {
  const type = file.type.toLowerCase();
  if (!type.startsWith("image/") || !ALLOWED_IMAGE_TYPES.has(type)) {
    return "Only PNG, JPEG, GIF, WebP, or BMP images can be pasted.";
  }
  if (file.size > TASK_PASTE_IMAGE_MAX_BYTES) {
    return "Image must be 10MB or smaller.";
  }
  return null;
}

export function normalizePastedImageFile(file: File): File {
  const name = file.name?.trim();
  if (name && name !== "image.png" && name !== "blob") {
    return file;
  }
  const ext = file.type.split("/")[1]?.replace("jpeg", "jpg") || "png";
  return new File([file], `screenshot-${Date.now()}.${ext}`, { type: file.type });
}
