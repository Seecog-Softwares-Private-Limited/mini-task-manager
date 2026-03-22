#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');
const net = require('net');
const { spawn } = require('child_process');

// Load ports (and other vars) from properties.env so they're available before Nest loads
require('dotenv').config({ path: path.join(__dirname, 'properties.env') });

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
      '[app.js] Production mode requires a build. Run: npm run build\n' +
        '  Then run: node app.js (with NODE_ENV=production) or npm run start:app:prod'
    );
    process.exit(1);
  }
  process.env.NODE_ENV = 'production';
  require(DIST_MAIN);
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

function startFrontend() {
  if (!fs.existsSync(FRONTEND_DIR) || !fs.existsSync(path.join(FRONTEND_DIR, 'package.json'))) {
    console.warn('[app.js] Frontend folder not found; skipping frontend.');
    return;
  }
  const frontendPort = process.env.FRONTEND_PORT || '3001';
  const apiPort = process.env.PORT || '3000';
  // Next API proxy (app/api/v1/[...path]) uses this so it always matches Nest, regardless of cwd.
  const miniTmBackendUrl = `http://127.0.0.1:${apiPort}`;
  console.log('[app.js] Starting frontend (Next.js) on http://localhost:' + frontendPort);
  console.log('[app.js] Next proxy → Nest at ' + miniTmBackendUrl);
  frontendChild = spawn('npx', ['next', 'dev', '-p', frontendPort], {
    cwd: FRONTEND_DIR,
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      FORCE_COLOR: '1',
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
  checkNodeVersion();
  checkEnvFile();
  checkDbEnv();

  if (mode === 'production') {
    runProduction();
  } else {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[app.js] Starting in development mode (source: src/main.ts)');
    }
    runDevelopment();
    const apiPort = parseInt(process.env.PORT || '3000', 10);
    console.log(
      '[app.js] Waiting for API to accept connections on 127.0.0.1:' + apiPort + ' ...'
    );
    waitForApiPort(apiPort).then((ready) => {
      if (ready) {
        console.log('[app.js] API port is open; starting Next.js.');
      } else {
        console.warn(
          '[app.js] API did not open within the timeout. Check MySQL and Nest logs. Starting Next anyway.'
        );
      }
      startFrontend();
    });
  }
}

main();
