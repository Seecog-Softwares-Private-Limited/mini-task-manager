/**
 * Prefer empty NEXT_PUBLIC_API_URL so the browser uses same-origin `/api/v1` (Next.js rewrites → API).
 * Avoid setting NEXT_PUBLIC_API_URL in .env.local unless the API is on another host; wrong values break login.
 */
const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL ?? "";
const API_PREFIX = "/api/v1";

export const config = {
  apiBaseUrl: API_ORIGIN ? `${API_ORIGIN}${API_PREFIX}` : API_PREFIX,
  apiOrigin: API_ORIGIN || (typeof window !== "undefined" ? window.location.origin : ""),
} as const;
