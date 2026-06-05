#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// Load properties.env from repo root so FRONTEND_PORT is available
const propsPath = path.join(__dirname, '..', 'properties.env');
if (fs.existsSync(propsPath)) {
  require('dotenv').config({ path: propsPath });
}

const ROOT = path.resolve(__dirname);
const PORT = process.env.FRONTEND_PORT || process.env.PORT || '3001';
const nextBin = path.join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next');

console.log('[frontend app.js] Starting Next.js dev server on port', PORT);
console.log('[frontend app.js] Open http://localhost:' + PORT);

if (!fs.existsSync(nextBin)) {
  console.error(
    '[frontend app.js] Next.js is not installed. Run:\n  cd frontend && npm install',
  );
  process.exit(1);
}

const child = spawn(process.execPath, [nextBin, 'dev', '-p', PORT], {
  cwd: ROOT,
  stdio: 'inherit',
});

child.on('error', (err) => {
  console.error('[frontend app.js] Failed to start:', err.message);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (code !== null && code !== 0) process.exit(code);
  if (signal) process.exit(1);
});
