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

function applyEnvironmentUrls() {
  const mode = getAppMode();
  const isProduction = mode === 'production';
  const frontendPort = process.env.FRONTEND_PORT || '3001';

  const localFrontend =
    process.env.FRONTEND_URL_LOCAL?.trim() || `http://localhost:${frontendPort}`;
  const localCors = process.env.CORS_ORIGIN_LOCAL?.trim() || localFrontend;

  const prodFrontend = process.env.FRONTEND_URL_PRODUCTION?.trim();
  const prodCors = process.env.CORS_ORIGIN_PRODUCTION?.trim() || prodFrontend;

  if (isProduction) {
    if (prodFrontend) {
      process.env.FRONTEND_URL = stripTrailingSlash(prodFrontend);
    } else if (process.env.FRONTEND_URL_LOCAL && !process.env.FRONTEND_URL) {
      console.warn(
        '[resolve-env-urls] APP_MODE=production but FRONTEND_URL_PRODUCTION is missing — ' +
          'invitation emails may use localhost links. Set FRONTEND_URL_PRODUCTION in properties.env.',
      );
    }
    if (prodCors) {
      process.env.CORS_ORIGIN = stripTrailingSlash(prodCors);
    }
  } else {
    process.env.FRONTEND_URL = stripTrailingSlash(localFrontend);
    process.env.CORS_ORIGIN = stripTrailingSlash(localCors);
  }

  return {
    mode,
    frontendUrl: process.env.FRONTEND_URL,
    corsOrigin: process.env.CORS_ORIGIN,
  };
}

module.exports = { applyEnvironmentUrls, getAppMode };
