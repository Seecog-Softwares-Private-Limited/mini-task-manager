/**
 * Client-side UUID for optimistic UI ids (subtasks, previews, etc.).
 * `crypto.randomUUID` is unavailable on HTTP (non-localhost), e.g. IP-based production deploys.
 */
export function generateClientId(prefix?: string): string {
  let id: string | null = null;

  if (
    typeof window !== "undefined" &&
    window.isSecureContext &&
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    try {
      id = crypto.randomUUID();
    } catch {
      id = null;
    }
  }

  if (!id) {
    id = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
      const random = (Math.random() * 16) | 0;
      const value = char === "x" ? random : (random & 0x3) | 0x8;
      return value.toString(16);
    });
  }

  return prefix ? `${prefix}${id}` : id;
}
