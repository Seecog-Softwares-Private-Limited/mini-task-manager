/**
 * Base URL for browser links in emails (verify email, reset password, invites).
 * Set FRONTEND_URL_LOCAL / FRONTEND_URL_PRODUCTION in properties.env; APP_MODE picks the active one.
 */
export function resolveFrontendPublicUrl(): string {
  const explicit = process.env.FRONTEND_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }
  const port = process.env.FRONTEND_PORT || '3001';
  const local =
    process.env.FRONTEND_URL_LOCAL?.trim() || `http://localhost:${port}`;
  return local.replace(/\/$/, '');
}

/** @deprecated alias — use resolveFrontendPublicUrl */
export const getFrontendUrl = resolveFrontendPublicUrl;
