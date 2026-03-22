import { join } from 'path';
import { config as loadEnv } from 'dotenv';

/**
 * Load repo-root `properties.env` before Nest reads PORT / DB_* / JWT_*.
 * Keeps API port aligned with `frontend/next.config.mjs` when using `nest start` or `npm run dev`
 * (not only `node app.js`).
 */
loadEnv({ path: join(process.cwd(), 'properties.env') });
