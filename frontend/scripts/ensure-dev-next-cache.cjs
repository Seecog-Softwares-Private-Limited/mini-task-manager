/**
 * `next build` overwrites .next with production chunks (hashed filenames, no main-app.js).
 * A running or restarted `next dev` then 404s layout.css / main-app.js → blank pages.
 * Clear .next when a production BUILD_ID exists without dev entry chunks.
 */
const fs = require('fs');
const path = require('path');

function ensureDevNextCache(frontendDir) {
  const nextDir = path.join(frontendDir, '.next');
  const buildIdFile = path.join(nextDir, 'BUILD_ID');
  const devMainApp = path.join(nextDir, 'static', 'chunks', 'main-app.js');

  if (!fs.existsSync(nextDir)) return false;

  const hasProdBuildId = fs.existsSync(buildIdFile);
  const hasDevMainApp = fs.existsSync(devMainApp);

  if (hasProdBuildId && !hasDevMainApp) {
    console.warn(
      '[next] Production .next cache without dev chunks — clearing to prevent blank pages.',
    );
    console.warn('[next] Run `cd frontend && npm run build` before production deploy.');
    fs.rmSync(nextDir, { recursive: true, force: true });
    return true;
  }

  return false;
}

module.exports = { ensureDevNextCache };
