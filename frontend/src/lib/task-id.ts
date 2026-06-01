/** Standard UUID string (any version). */
const UUID_STANDARD =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function uuidFromHex(hex: string): string | undefined {
  const normalized = hex.replace(/-/g, "").toLowerCase();
  if (normalized.length !== 32 || !/^[0-9a-f]+$/.test(normalized)) return undefined;
  return [
    normalized.slice(0, 8),
    normalized.slice(8, 12),
    normalized.slice(12, 16),
    normalized.slice(16, 20),
    normalized.slice(20, 32),
  ].join("-");
}

/** Coerce API id fields (string, Buffer JSON, etc.) into a UUID string. */
export function normalizeTaskId(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (UUID_STANDARD.test(trimmed)) return trimmed;
    const fromHex = uuidFromHex(trimmed);
    return fromHex;
  }
  if (typeof value === "object") {
    const maybeBuffer = value as { type?: string; data?: number[] };
    if (maybeBuffer.type === "Buffer" && Array.isArray(maybeBuffer.data)) {
      const hex = maybeBuffer.data.map((b) => b.toString(16).padStart(2, "0")).join("");
      return uuidFromHex(hex);
    }
  }
  return undefined;
}

export function isValidTaskId(id: string | null | undefined): id is string {
  return typeof id === "string" && UUID_STANDARD.test(id.trim());
}
