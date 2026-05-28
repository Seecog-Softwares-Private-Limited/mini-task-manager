/**
 * Base URL for browser links in emails (verify email, reset password, invites).
 * Set FRONTEND_URL for production. In local dev, FRONTEND_PORT matches Next.js (see properties.env).
 */
export function resolveFrontendPublicUrl(): string {
  const explicit = process.env.FRONTEND_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }
  const port = process.env.FRONTEND_PORT || '3001';
  return `http://localhost:${port}`;
}

/** @deprecated alias — use resolveFrontendPublicUrl */
export const getFrontendUrl = resolveFrontendPublicUrl;
