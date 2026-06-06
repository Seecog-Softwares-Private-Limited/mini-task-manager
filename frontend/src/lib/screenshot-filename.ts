/** Default pasted screenshot name: screenshot-yyyy-mm-dd-hhmm.png */
export function defaultScreenshotFilename(ext = "png"): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  return `screenshot-${y}-${m}-${d}-${h}${min}.${ext.replace(/^\./, "")}`;
}

export function normalizePastedScreenshotFile(file: File): File {
  const name = file.name?.trim();
  if (name && name !== "image.png" && name !== "blob") {
    return file;
  }
  const ext = file.type.split("/")[1]?.replace("jpeg", "jpg") || "png";
  return new File([file], defaultScreenshotFilename(ext), { type: file.type });
}
