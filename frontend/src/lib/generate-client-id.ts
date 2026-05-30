/**
 * Client-side UUID for optimistic UI ids (subtasks, previews, etc.).
 * `crypto.randomUUID` only works in secure contexts (HTTPS or localhost), not on HTTP IP deploys.
 */
function canUseCryptoRandomUuid(): boolean {
  if (typeof window === "undefined" || typeof crypto === "undefined") return false;
  if (typeof crypto.randomUUID !== "function") return false;
  const { protocol, hostname } = window.location;
  if (protocol === "https:") return true;
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

function fallbackUuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function generateClientId(prefix?: string): string {
  let id: string | null = null;

  if (canUseCryptoRandomUuid()) {
    try {
      id = crypto.randomUUID();
    } catch {
      id = null;
    }
  }

  if (!id) id = fallbackUuid();

  return prefix ? `${prefix}${id}` : id;
}
