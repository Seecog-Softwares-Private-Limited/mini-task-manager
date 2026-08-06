#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');
const net = require('net');
const { spawn } = require('child_process');

// Load ports (and other vars) from properties.env so they're available before Nest loads
require('dotenv').config({ path: path.join(__dirname, 'properties.env') });
const { applyEnvironmentUrls, getAppMode } = require('./scripts/resolve-env-urls.cjs');
const resolvedUrls = applyEnvironmentUrls();

const ROOT = path.resolve(__dirname);
const FRONTEND_DIR = path.join(ROOT, 'frontend');
const DIST_MAIN = path.join(ROOT, 'dist', 'main.js');
const SRC_MAIN = path.join(ROOT, 'src', 'main.ts');

let frontendChild = null;

function getMode() {
  const explicit = process.env.APP_MODE;
  if (explicit === 'development' || explicit === 'production') return explicit;
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv === 'production') return 'production';
  return 'development';
}

function checkNodeVersion() {
  const major = parseInt(process.version.slice(1).split('.')[0], 10);
  if (major < 18) {
    console.warn(
      '[app.js] Warning: Node 18+ is recommended. Current: ' + process.version
    );
  }
}

function checkEnvFile() {
  const envPath = path.join(ROOT, 'properties.env');
  if (!fs.existsSync(envPath)) {
    console.warn(
      '[app.js] No properties.env file found. Create properties.env and set DB_*, JWT_SECRET, etc.'
    );
  }
  const legacyDotEnv = path.join(ROOT, '.env');
  if (fs.existsSync(legacyDotEnv)) {
    console.warn(
      '[app.js] Found .env — this project does not load it. Move variables into properties.env and remove .env.'
    );
  }
}

function checkDbEnv() {
  const vars = ['DB_HOST', 'DB_USERNAME', 'DB_PASSWORD', 'DB_DATABASE'];
  const missing = vars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    console.warn(
      '[app.js] Database env not set: ' +
        missing.join(', ') +
        '. Set them in properties.env for the API to connect.'
    );
  }
}

function runProduction() {
  if (!fs.existsSync(DIST_MAIN)) {
    console.error(
      '[app.js] Production mode requires a backend build. Run: npm run build\n' +
        '  Then run: node app.js (with APP_MODE=production) or npm run start:app:prod'
    );
    process.exit(1);
  }
  process.env.NODE_ENV = 'production';
  require(DIST_MAIN);
}

function scheduleFrontend(mode) {
  const apiPort = parseInt(process.env.PORT || '3000', 10);
  const frontendPort = process.env.FRONTEND_PORT || '3001';
  console.log(
    '[app.js] Backend + frontend via node app.js (' + mode + ')\n' +
      '  API:      http://localhost:' + apiPort + '/api/v1\n' +
      '  Frontend: http://localhost:' + frontendPort,
  );
  console.log(
    '[app.js] Waiting for API to accept connections on 127.0.0.1:' + apiPort + ' ...',
  );
  waitForApiPort(apiPort).then((ready) => {
    if (ready) {
      console.log('[app.js] API port is open; starting Next.js.');
    } else {
      console.warn(
        '[app.js] API did not open within the timeout. Check MySQL and Nest logs. Starting Next anyway.',
      );
    }
    startFrontend(mode);
  });
}

function runDevelopment() {
  if (!fs.existsSync(SRC_MAIN)) {
    console.error('[app.js] Source entry not found: src/main.ts');
    process.exit(1);
  }
  try {
    require.resolve('ts-node');
  } catch (e) {
    console.error(
      '[app.js] Dev mode needs ts-node. Run: npm install (ts-node is a devDependency)'
    );
    process.exit(1);
  }
  try {
    require.resolve('tsconfig-paths');
  } catch (e) {
    console.error(
      '[app.js] Dev mode needs tsconfig-paths. Run: npm install (tsconfig-paths is a devDependency)'
    );
    process.exit(1);
  }
  process.env.NODE_ENV = 'development';
  require('ts-node/register');
  require('tsconfig-paths/register');
  require(SRC_MAIN);
}

/**
 * Nest calls listen() asynchronously after require(main). Next must not start until
 * the API port accepts connections, or POST /api/v1/auth/login via rewrite hangs forever ("Signing in...").
 */
function waitForApiPort(port, options) {
  const host = options?.host || '127.0.0.1';
  const maxMs = options?.maxMs ?? 120000;
  const intervalMs = options?.intervalMs ?? 250;
  const started = Date.now();
  return new Promise((resolve) => {
    function tryConnect() {
      if (Date.now() - started > maxMs) {
        resolve(false);
        return;
      }
      const socket = net.connect({ port, host }, () => {
        socket.setTimeout(0);
        socket.end();
        resolve(true);
      });
      socket.setTimeout(2000, () => {
        socket.destroy();
        setTimeout(tryConnect, intervalMs);
      });
      socket.on('error', () => {
        socket.destroy();
        setTimeout(tryConnect, intervalMs);
      });
    }
    tryConnect();
  });
}

/**
 * Running `next build` while `next dev` is active leaves production artifacts in .next
 * without dev chunks (main-app.js, css/app/layout.css) → blank pages.
 */
function prepareDevNextCache() {
  const { ensureDevNextCache } = require(path.join(FRONTEND_DIR, 'scripts', 'ensure-dev-next-cache.cjs'));
  ensureDevNextCache(FRONTEND_DIR);
}

/**
 * Next.js standalone output omits .next/static and public/. Without them, pages load blank
 * with 404s on layout.css and chunk JS (see Dockerfile runner stage for the same copy steps).
 */
function ensureStandaloneAssets() {
  const standaloneDir = path.join(FRONTEND_DIR, '.next', 'standalone');
  const staticSrc = path.join(FRONTEND_DIR, '.next', 'static');
  const staticDest = path.join(standaloneDir, '.next', 'static');
  const publicSrc = path.join(FRONTEND_DIR, 'public');
  const publicDest = path.join(standaloneDir, 'public');

  if (!fs.existsSync(standaloneDir) || !fs.existsSync(staticSrc)) {
    return false;
  }

  fs.mkdirSync(path.dirname(staticDest), { recursive: true });
  fs.cpSync(staticSrc, staticDest, { recursive: true, force: true });

  if (fs.existsSync(publicSrc)) {
    fs.cpSync(publicSrc, publicDest, { recursive: true, force: true });
  }

  console.log('[app.js] Standalone assets synced (.next/static + public)');
  return true;
}

function isLocalhostHttpUrl(url) {
  try {
    const host = new URL(url).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0';
  } catch {
    return /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?/i.test(url);
  }
}

/**
 * Prefer an explicit remote API (VPS) so local Next never talks to a local Nest
 * that would split uploads from the live app.
 */
function resolveFrontendBackendUrl(apiPort) {
  const candidates = [
    process.env.MINI_TM_BACKEND_URL,
    process.env.BACKEND_INTERNAL_URL,
    process.env.PUBLIC_API_URL,
  ];
  for (const raw of candidates) {
    const value = String(raw || '').trim().replace(/\/$/, '');
    if (value && !isLocalhostHttpUrl(value)) {
      return value;
    }
  }
  return `http://127.0.0.1:${apiPort}`;
}

function startFrontend(mode) {
  if (!fs.existsSync(FRONTEND_DIR) || !fs.existsSync(path.join(FRONTEND_DIR, 'package.json'))) {
    console.error('[app.js] Frontend folder not found.');
    process.exit(1);
  }
  const isProd = mode === 'production';
  const frontendPort = process.env.FRONTEND_PORT || '3001';
  const apiPort = process.env.PORT || '3000';
  // Next API proxy (app/api/v1/[...path]) uses this so it always matches Nest, regardless of cwd.
  const miniTmBackendUrl = resolveFrontendBackendUrl(apiPort);
  const nextBin = path.join(FRONTEND_DIR, 'node_modules', 'next', 'dist', 'bin', 'next');
  if (!fs.existsSync(nextBin)) {
    console.error(
      '[app.js] Frontend dependencies are missing. Run:\n  cd frontend && npm install',
    );
    process.exit(1);
  }
  if (isProd && !fs.existsSync(path.join(FRONTEND_DIR, '.next'))) {
    console.error(
      '[app.js] Production frontend requires a build. Run:\n  cd frontend && npm run build',
    );
    process.exit(1);
  }
  if (!isProd) {
    prepareDevNextCache();
  }
  const standaloneServer = path.join(FRONTEND_DIR, '.next', 'standalone', 'server.js');
  const useStandalone = isProd && fs.existsSync(standaloneServer);
  if (useStandalone && !ensureStandaloneAssets()) {
    console.warn(
      '[app.js] Could not sync standalone static assets. Run: cd frontend && npm run build',
    );
  }
  const nextArgs = useStandalone
    ? [standaloneServer]
    : isProd
      ? [nextBin, 'start', '-p', frontendPort]
      : [nextBin, 'dev', '-p', frontendPort];
  const frontendMode = useStandalone ? 'standalone' : isProd ? 'production' : 'dev';
  console.log(
    '[app.js] Starting frontend (Next.js ' + frontendMode + ') on http://localhost:' + frontendPort,
  );
  console.log('[app.js] Next proxy → Nest at ' + miniTmBackendUrl);
  frontendChild = spawn(process.execPath, nextArgs, {
    cwd: useStandalone ? path.join(FRONTEND_DIR, '.next', 'standalone') : FRONTEND_DIR,
    stdio: 'inherit',
    env: {
      ...process.env,
      FORCE_COLOR: '1',
      PORT: frontendPort,
      HOSTNAME: '0.0.0.0',
      MINI_TM_BACKEND_URL: miniTmBackendUrl,
    },
  });
  frontendChild.on('error', (err) => {
    console.error('[app.js] Frontend failed to start:', err.message);
  });
  frontendChild.on('exit', (code, signal) => {
    if (code !== null && code !== 0) console.warn('[app.js] Frontend exited with code', code);
  });

  function killFrontend() {
    if (frontendChild) {
      frontendChild.kill('SIGTERM');
      frontendChild = null;
    }
  }
  process.on('SIGINT', () => { killFrontend(); process.exit(130); });
  process.on('SIGTERM', () => { killFrontend(); process.exit(143); });
}

function main() {
  const mode = getMode();
  console.log(
    '[app.js] Environment URLs (APP_MODE=' +
      getAppMode() +
      '): FRONTEND_URL=' +
      process.env.FRONTEND_URL +
      ', CORS_ORIGIN=' +
      process.env.CORS_ORIGIN,
  );
  checkNodeVersion();
  checkEnvFile();
  checkDbEnv();

  const apiPort = process.env.PORT || '3000';
  const frontendBackendUrl = resolveFrontendBackendUrl(apiPort);
  const useRemoteApiOnly = !isLocalhostHttpUrl(frontendBackendUrl);

  if (mode === 'production') {
    if (useRemoteApiOnly) {
      console.log(
        '[app.js] Remote API only — skipping local Nest. Next proxy → ' + frontendBackendUrl,
      );
      startFrontend('production');
      return;
    }
    runProduction();
    scheduleFrontend('production');
    return;
  }

  if (useRemoteApiOnly) {
    console.log(
      '[app.js] Remote API only — skipping local Nest. Next proxy → ' + frontendBackendUrl,
    );
    startFrontend('development');
    return;
  }

  console.log('[app.js] Starting backend in development mode (source: src/main.ts)');
  runDevelopment();
  scheduleFrontend('development');
}

main();
