/**
 * Environment-based config. Use NEXT_PUBLIC_ for client-visible values.
 */
const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
const API_PREFIX = "/api/v1";

export const config = {
  apiBaseUrl: `${API_ORIGIN}${API_PREFIX}`,
  apiOrigin: API_ORIGIN,
} as const;
