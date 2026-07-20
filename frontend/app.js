#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// Load properties.env from repo root so FRONTEND_PORT / APP_MODE are available
const propsPath = path.join(__dirname, '..', 'properties.env');
if (fs.existsSync(propsPath)) {
  require('dotenv').config({ path: propsPath });
}

const ROOT = path.resolve(__dirname);
const PORT = process.env.FRONTEND_PORT || process.env.PORT || '3001';
const nextBin = path.join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next');

function getMode() {
  const explicit = process.env.APP_MODE;
  if (explicit === 'development' || explicit === 'production') return explicit;
  if (process.env.NODE_ENV === 'production') return 'production';
  return 'development';
}

function ensureStandaloneAssets() {
  const standaloneDir = path.join(ROOT, '.next', 'standalone');
  const staticSrc = path.join(ROOT, '.next', 'static');
  const staticDest = path.join(standaloneDir, '.next', 'static');
  const publicSrc = path.join(ROOT, 'public');
  const publicDest = path.join(standaloneDir, 'public');

  if (!fs.existsSync(standaloneDir) || !fs.existsSync(staticSrc)) {
    return false;
  }

  fs.mkdirSync(path.dirname(staticDest), { recursive: true });
  fs.cpSync(staticSrc, staticDest, { recursive: true, force: true });

  if (fs.existsSync(publicSrc)) {
    fs.cpSync(publicSrc, publicDest, { recursive: true, force: true });
  }

  console.log('[frontend app.js] Standalone assets synced (.next/static + public)');
  return true;
}

function resolveBackendUrl() {
  const apiPort = process.env.PORT || '3000';
  return process.env.MINI_TM_BACKEND_URL || `http://127.0.0.1:${apiPort}`;
}

function main() {
  const mode = getMode();
  const isProd = mode === 'production';

  if (!fs.existsSync(nextBin)) {
    console.error(
      '[frontend app.js] Next.js is not installed. Run:\n  cd frontend && npm install',
    );
    process.exit(1);
  }

  if (isProd && !fs.existsSync(path.join(ROOT, '.next'))) {
    console.error(
      '[frontend app.js] Production mode requires a frontend build. Run:\n  cd frontend && npm run build',
    );
    process.exit(1);
  }

  const backendUrl = resolveBackendUrl();
  const standaloneServer = path.join(ROOT, '.next', 'standalone', 'server.js');
  const useStandalone = isProd && fs.existsSync(standaloneServer);

  if (useStandalone && !ensureStandaloneAssets()) {
    console.warn(
      '[frontend app.js] Could not sync standalone static assets. Run: cd frontend && npm run build',
    );
  }

  const nextArgs = useStandalone
    ? [standaloneServer]
    : isProd
      ? [nextBin, 'start', '-p', PORT]
      : [nextBin, 'dev', '-p', PORT];

  const frontendMode = useStandalone ? 'standalone' : isProd ? 'production' : 'dev';
  console.log(
    '[frontend app.js] Starting Next.js (' + frontendMode + ') on http://localhost:' + PORT,
  );
  console.log('[frontend app.js] Open http://localhost:' + PORT);
  console.log('[frontend app.js] API proxy → Nest at ' + backendUrl);

  const child = spawn(process.execPath, nextArgs, {
    cwd: useStandalone ? path.join(ROOT, '.next', 'standalone') : ROOT,
    stdio: 'inherit',
    env: {
      ...process.env,
      FORCE_COLOR: '1',
      PORT,
      HOSTNAME: '0.0.0.0',
      MINI_TM_BACKEND_URL: backendUrl,
    },
  });

  child.on('error', (err) => {
    console.error('[frontend app.js] Failed to start:', err.message);
    process.exit(1);
  });

  child.on('exit', (code, signal) => {
    if (code !== null && code !== 0) process.exit(code);
    if (signal) process.exit(1);
  });
}

main();
