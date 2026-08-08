import { join } from 'path';
import { config as loadEnv } from 'dotenv';

/**
 * Load repo-root `.env` before Nest reads PORT / DB_* / JWT_*.
 * Keeps API port aligned with `frontend/next.config.mjs` when using `nest start` or `npm run dev`
 * (not only `node app.js`).
 */
loadEnv({ path: join(process.cwd(), '.env') });
// eslint-disable-next-line @typescript-eslint/no-require-imports
require(join(process.cwd(), 'scripts/resolve-env-urls.cjs')).applyEnvironmentUrls();
