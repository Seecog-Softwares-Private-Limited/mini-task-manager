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

/** Optional public API base (no trailing slash), e.g. http://3.110.214.243:3007 */
export function resolvePublicApiBaseUrl(): string | undefined {
  const raw =
    process.env.PUBLIC_API_URL?.trim() ||
    process.env.API_PUBLIC_URL?.trim() ||
    process.env.BACKEND_PUBLIC_URL?.trim();
  if (!raw) return undefined;
  return stripTrailingSlash(raw);
}

/**
 * When FRONTEND_URL_PRODUCTION is unset but PUBLIC_API_URL points at a public host,
 * derive the browser app URL (same host, public frontend port — default 3000).
 */
export function deriveFrontendUrlFromPublicApi(): string | undefined {
  const apiBase = resolvePublicApiBaseUrl();
  if (!apiBase || isLocalhostUrl(apiBase)) return undefined;

  try {
    const api = new URL(apiBase);
    const productionUrl = process.env.FRONTEND_URL_PRODUCTION?.trim();
    if (productionUrl) {
      try {
        const prod = new URL(productionUrl);
        return `${api.protocol}//${api.hostname}:${prod.port || (prod.protocol === 'https:' ? '443' : '80')}`;
      } catch {
        /* fall through */
      }
    }

    const publicFrontendPort =
      process.env.FRONTEND_PUBLIC_PORT?.trim() ||
      process.env.FRONTEND_URL_PRODUCTION?.match(/:(\d+)/)?.[1] ||
      '3000';

    return `${api.protocol}//${api.hostname}:${publicFrontendPort}`;
  } catch {
    return undefined;
  }
}

/**
 * Public browser URL for the Next.js app (invite, verify-email, reset-password links).
 * Prefers FRONTEND_URL_PRODUCTION; falls back to PUBLIC_API_URL host when localhost would be used.
 */
export function resolveFrontendPublicUrl(): string {
  const mode = getAppMode();
  const frontendPort = process.env.FRONTEND_PORT || '3001';
  const local =
    process.env.FRONTEND_URL_LOCAL?.trim() || `http://localhost:${frontendPort}`;
  const production = process.env.FRONTEND_URL_PRODUCTION?.trim();
  const explicit = process.env.FRONTEND_URL?.trim();
  const fromApi = deriveFrontendUrlFromPublicApi();

  if (mode === 'production') {
    if (production) return stripTrailingSlash(production);
    if (explicit && !isLocalhostUrl(explicit)) return stripTrailingSlash(explicit);
    if (fromApi) return stripTrailingSlash(fromApi);
    return stripTrailingSlash(local);
  }

  if (explicit && !isLocalhostUrl(explicit)) return stripTrailingSlash(explicit);
  if (production && !isLocalhostUrl(production)) return stripTrailingSlash(production);
  if (fromApi) return stripTrailingSlash(fromApi);
  return stripTrailingSlash(local);
}

export function buildInviteAcceptUrls(token: string): {
  /** Link in the email button — same as directAppUrl (app /invite page). */
  acceptUrl: string;
  /** Direct app URL — copy-paste fallback in the email body. */
  directAppUrl: string;
} {
  const directAppUrl = `${resolveFrontendPublicUrl()}/invite/${encodeURIComponent(token)}`;
  return { acceptUrl: directAppUrl, directAppUrl };
}

/** @deprecated alias — use resolveFrontendPublicUrl */
export const getFrontendUrl = resolveFrontendPublicUrl;
