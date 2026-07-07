#!/usr/bin/env node
/**
 * Next.js standalone output does not include .next/static or public/.
 * Copy them into .next/standalone so CSS/JS chunks are served correctly.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = path.resolve(__dirname, '..');
const STANDALONE_DIR = path.join(FRONTEND_DIR, '.next', 'standalone');

function syncStandaloneAssets() {
  const staticSrc = path.join(FRONTEND_DIR, '.next', 'static');
  const staticDest = path.join(STANDALONE_DIR, '.next', 'static');
  const publicSrc = path.join(FRONTEND_DIR, 'public');
  const publicDest = path.join(STANDALONE_DIR, 'public');

  if (!fs.existsSync(STANDALONE_DIR)) {
    console.warn('[sync-standalone-assets] No standalone build at', STANDALONE_DIR);
    // Do not fail the build if standalone output is unavailable.
    return true;
  }
  if (!fs.existsSync(staticSrc)) {
    console.warn('[sync-standalone-assets] Missing .next/static — run npm run build first');
    // Keep postbuild non-blocking for deployment pipelines.
    return true;
  }

  fs.mkdirSync(path.dirname(staticDest), { recursive: true });
  fs.cpSync(staticSrc, staticDest, { recursive: true, force: true });

  if (fs.existsSync(publicSrc)) {
    fs.cpSync(publicSrc, publicDest, { recursive: true, force: true });
  }

  console.log('[sync-standalone-assets] Synced .next/static and public → standalone');
  return true;
}

const ok = syncStandaloneAssets();
process.exit(ok ? 0 : 1);
