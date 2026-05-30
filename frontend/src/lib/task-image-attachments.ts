import type { TaskAttachment } from "@/types/api";

const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|bmp|svg)$/i;

/** True when the attachment is an image we can preview in the description area. */
export function isTaskImageAttachment(attachment: TaskAttachment): boolean {
  const mime = attachment.mimeType?.toLowerCase() ?? "";
  if (mime.startsWith("image/")) return true;
  return IMAGE_EXTENSIONS.test(attachment.fileName ?? "");
}

export function filterTaskImageAttachments(attachments: TaskAttachment[]): TaskAttachment[] {
  return attachments.filter(isTaskImageAttachment);
}
