/** Pick the best MediaRecorder MIME for this browser. */
export function pickVoiceNoteMimeType(): { mimeType: string; extension: string } {
  if (typeof MediaRecorder === "undefined") {
    return { mimeType: "audio/webm", extension: "webm" };
  }

  const candidates: Array<{ mimeType: string; extension: string }> = [
    { mimeType: "audio/webm;codecs=opus", extension: "webm" },
    { mimeType: "audio/webm", extension: "webm" },
    { mimeType: "audio/mp4", extension: "m4a" },
    { mimeType: "audio/aac", extension: "aac" },
    { mimeType: "audio/ogg;codecs=opus", extension: "ogg" },
  ];

  for (const candidate of candidates) {
    if (MediaRecorder.isTypeSupported(candidate.mimeType)) {
      return candidate;
    }
  }

  return { mimeType: "", extension: "webm" };
}

export function buildVoiceNoteFileName(extension: string, date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}.${pad(date.getMinutes())}.${pad(date.getSeconds())}`;
  return `Voice note ${stamp}.${extension}`;
}

export function formatRecordingElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}
