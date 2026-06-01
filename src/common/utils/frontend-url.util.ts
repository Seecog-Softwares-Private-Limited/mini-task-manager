function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

export type AppMode = 'development' | 'production';

/** True when the URL points at local dev — email clients block these links. */
export function isLocalhostUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === 'localhost' || host === '127.0.0.1';
  } catch {
    return /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(url);
  }
}

/** Matches scripts/resolve-env-urls.cjs — used for email links and CORS. */
export function getAppMode(): AppMode {
  const explicit = process.env.APP_MODE;
  if (explicit === 'development' || explicit === 'production') return explicit;
  if (process.env.NODE_ENV === 'production') return 'production';
  return 'development';
}

/**
 * Public browser URL for the Next.js app (invite, verify-email, reset-password links).
 * Prefer FRONTEND_URL_PRODUCTION when APP_MODE=production (do not rely on localhost in prod).
 */
export function resolveFrontendPublicUrl(): string {
  const mode = getAppMode();
  const frontendPort = process.env.FRONTEND_PORT || '3001';
  const local =
    process.env.FRONTEND_URL_LOCAL?.trim() || `http://localhost:${frontendPort}`;
  const production = process.env.FRONTEND_URL_PRODUCTION?.trim();

  if (mode === 'production') {
    if (production) return stripTrailingSlash(production);
    const explicit = process.env.FRONTEND_URL?.trim();
    if (explicit && !isLocalhostUrl(explicit)) return stripTrailingSlash(explicit);
    return stripTrailingSlash(local);
  }

  const explicit = process.env.FRONTEND_URL?.trim();
  if (explicit) return stripTrailingSlash(explicit);
  return stripTrailingSlash(local);
}

/**
 * Optional public API base (no trailing slash), e.g. http://3.110.214.243:3007
 * When set, invitation emails use GET /api/v1/invitations/join/:token → redirect to the app.
 */
export function resolvePublicApiBaseUrl(): string | undefined {
  const raw =
    process.env.PUBLIC_API_URL?.trim() ||
    process.env.API_PUBLIC_URL?.trim() ||
    process.env.BACKEND_PUBLIC_URL?.trim();
  if (!raw) return undefined;
  return stripTrailingSlash(raw);
}

export function buildInviteAcceptUrls(token: string): {
  /** Link in the email button (API redirect when PUBLIC_API_URL is set). */
  acceptUrl: string;
  /** Direct app URL — always shown as copy-paste fallback. */
  directAppUrl: string;
} {
  const directAppUrl = `${resolveFrontendPublicUrl()}/invite/${encodeURIComponent(token)}`;
  const apiBase = resolvePublicApiBaseUrl();
  if (apiBase) {
    const prefix = (process.env.API_PREFIX || 'api/v1').replace(/^\/+|\/+$/g, '');
    const acceptUrl = `${apiBase}/${prefix}/invitations/join/${encodeURIComponent(token)}`;
    return { acceptUrl, directAppUrl };
  }
  return { acceptUrl: directAppUrl, directAppUrl };
}

/** @deprecated alias — use resolveFrontendPublicUrl */
export const getFrontendUrl = resolveFrontendPublicUrl;
