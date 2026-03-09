#!/usr/bin/env node
'use strict';

const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname);
const PORT = process.env.PORT || '3001';

console.log('[frontend app.js] Starting Next.js dev server on port', PORT);
console.log('[frontend app.js] Open http://localhost:' + PORT);

const child = spawn('npx', ['next', 'dev', '-p', PORT], {
  cwd: ROOT,
  stdio: 'inherit',
  shell: true,
});

child.on('error', (err) => {
  console.error('[frontend app.js] Failed to start:', err.message);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (code !== null && code !== 0) process.exit(code);
  if (signal) process.exit(1);
});
