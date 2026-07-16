/** Two-letter initials for avatar fallbacks. */
export function getAvatarInitials(name?: string): string {
  const value = (name ?? "").trim();
  if (!value) return "?";
  const parts = value.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return value.slice(0, 2).toUpperCase();
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function avatarApiPath(userId: string): string {
  return `/api/v1/users/avatar/${userId}`;
}

/** Stable portrait when no upload exists or the API file is missing locally. */
export function generatedAvatarUrl(userId?: string, name?: string): string {
  const seed = encodeURIComponent((userId ?? name ?? "user").trim());
  return `https://api.dicebear.com/7.x/thumbs/png?seed=${seed}&size=64`;
}

/**
 * Primary src for a user avatar.
 * 1. External / data URLs from the API
 * 2. Same-origin uploaded avatar endpoint (by userId or stored path)
 */
export function resolveAvatarSrc(
  avatarUrl?: string | null,
  userId?: string,
): string | undefined {
  const trimmed = avatarUrl?.trim();
  if (!trimmed && !userId) return undefined;

  if (trimmed && (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("data:"))) {
    return trimmed;
  }

  if (trimmed && UUID_RE.test(trimmed)) {
    return avatarApiPath(trimmed);
  }

  const apiMatch = trimmed?.match(/\/api\/v1\/users\/avatar\/([0-9a-f-]+)/i);
  if (apiMatch) {
    return avatarApiPath(apiMatch[1]);
  }

  // Avoid calling the backend avatar endpoint when `avatarUrl` is missing.
  // In this app, `avatarUrl` being empty means the user has no stored upload,
  // and requesting `/api/v1/users/avatar/:userId` would just generate 404s.
  if (userId && trimmed) {
    return avatarApiPath(userId);
  }

  if (trimmed?.startsWith("/")) {
    return trimmed;
  }

  if (trimmed) {
    return `/${trimmed}`;
  }

  return undefined;
}

/** Ordered sources to try before showing initials. */
export function avatarSrcCandidates(
  avatarUrl?: string | null,
  userId?: string,
  name?: string,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  function add(url?: string) {
    if (!url || seen.has(url)) return;
    seen.add(url);
    out.push(url);
  }

  const trimmed = avatarUrl?.trim();
  if (trimmed && (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("data:"))) {
    add(trimmed);
  }

  add(resolveAvatarSrc(avatarUrl, userId));
  add(generatedAvatarUrl(userId, name));

  return out;
}
