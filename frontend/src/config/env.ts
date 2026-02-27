/**
 * Environment-based config. Use NEXT_PUBLIC_ for client-visible values.
 * When NEXT_PUBLIC_API_URL is empty, use same-origin so Next.js rewrites proxy to backend.
 */
const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL ?? "";
const API_PREFIX = "/api/v1";

export const config = {
  apiBaseUrl: API_ORIGIN ? `${API_ORIGIN}${API_PREFIX}` : API_PREFIX,
  apiOrigin: API_ORIGIN || (typeof window !== "undefined" ? window.location.origin : "http://localhost:3001"),
} as const;
