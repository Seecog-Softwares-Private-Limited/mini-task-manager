#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname);
const DIST_MAIN = path.join(ROOT, 'dist', 'main.js');
const SRC_MAIN = path.join(ROOT, 'src', 'main.ts');

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
  }
}

main();
