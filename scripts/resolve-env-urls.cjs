'use strict';

/**
 * Picks FRONTEND_URL + CORS_ORIGIN from properties.env based on APP_MODE (or NODE_ENV).
 *
 * properties.env:
 *   APP_MODE=development|production
 *   FRONTEND_URL_LOCAL=http://localhost:3008
 *   CORS_ORIGIN_LOCAL=http://localhost:3008
 *   FRONTEND_URL_PRODUCTION=http://3.110.214.243:3000
 *   CORS_ORIGIN_PRODUCTION=http://3.110.214.243:3000
 *   PUBLIC_API_URL=http://3.110.214.243:3007  (fallback for invite links if production URL missing)
 */

function getAppMode() {
  const explicit = process.env.APP_MODE;
  if (explicit === 'development' || explicit === 'production') return explicit;
  if (process.env.NODE_ENV === 'production') return 'production';
  return 'development';
}

function stripTrailingSlash(url) {
  return url.replace(/\/+$/, '');
}

function isLocalhostUrl(url) {
  try {
    const host = new URL(url).hostname;
    return host === 'localhost' || host === '127.0.0.1';
  } catch {
    return /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(url);
  }
}

function deriveFrontendFromPublicApi() {
  const apiBase = (process.env.PUBLIC_API_URL || process.env.API_PUBLIC_URL || '').trim();
  if (!apiBase || isLocalhostUrl(apiBase)) return undefined;
  try {
    const api = new URL(apiBase);
    const prodUrl = (process.env.FRONTEND_URL_PRODUCTION || '').trim();
    let port = process.env.FRONTEND_PUBLIC_PORT || '3000';
    if (prodUrl) {
      const m = prodUrl.match(/:(\d+)/);
      if (m) port = m[1];
    }
    return `${api.protocol}//${api.hostname}:${port}`;
  } catch {
    return undefined;
  }
}

function applyEnvironmentUrls() {
  const mode = getAppMode();
  const isProduction = mode === 'production';
  const frontendPort = process.env.FRONTEND_PORT || '3001';

  const localFrontend =
    process.env.FRONTEND_URL_LOCAL?.trim() || `http://localhost:${frontendPort}`;
  const localCors = process.env.CORS_ORIGIN_LOCAL?.trim() || localFrontend;

  const prodFrontend = process.env.FRONTEND_URL_PRODUCTION?.trim();
  const prodCors = process.env.CORS_ORIGIN_PRODUCTION?.trim() || prodFrontend;
  const fromApi = deriveFrontendFromPublicApi();

  if (isProduction) {
    if (prodFrontend) {
      process.env.FRONTEND_URL = stripTrailingSlash(prodFrontend);
    } else if (fromApi) {
      process.env.FRONTEND_URL = stripTrailingSlash(fromApi);
      console.warn(
        '[resolve-env-urls] FRONTEND_URL_PRODUCTION missing — using PUBLIC_API_URL host for FRONTEND_URL:',
        process.env.FRONTEND_URL,
      );
    } else if (!process.env.FRONTEND_URL || isLocalhostUrl(process.env.FRONTEND_URL)) {
      console.warn(
        '[resolve-env-urls] APP_MODE=production but FRONTEND_URL_PRODUCTION is missing — ' +
          'invitation emails may use localhost links. Set FRONTEND_URL_PRODUCTION in properties.env.',
      );
    }
    if (prodCors) {
      process.env.CORS_ORIGIN = stripTrailingSlash(prodCors);
    } else if (fromApi) {
      process.env.CORS_ORIGIN = stripTrailingSlash(fromApi);
    }
  } else {
    const explicit = process.env.FRONTEND_URL?.trim();
    if (explicit && !isLocalhostUrl(explicit)) {
      process.env.FRONTEND_URL = stripTrailingSlash(explicit);
    } else if (prodFrontend && !isLocalhostUrl(prodFrontend)) {
      process.env.FRONTEND_URL = stripTrailingSlash(prodFrontend);
    } else if (fromApi) {
      process.env.FRONTEND_URL = stripTrailingSlash(fromApi);
      console.warn(
        '[resolve-env-urls] APP_MODE=development but PUBLIC_API_URL is public — using derived FRONTEND_URL for emails:',
        process.env.FRONTEND_URL,
      );
    } else {
      process.env.FRONTEND_URL = stripTrailingSlash(localFrontend);
    }
    // Local dev: always use local CORS (never production URL from PUBLIC_API_URL / prod keys).
    process.env.CORS_ORIGIN = stripTrailingSlash(localCors);
  }

  return {
    mode,
    frontendUrl: process.env.FRONTEND_URL,
    corsOrigin: process.env.CORS_ORIGIN,
  };
}

module.exports = { applyEnvironmentUrls, getAppMode };
