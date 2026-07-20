/**
 * PM2 config for mini-task-manager (single process: API + Next via app.js).
 *
 * Prereqs:
 *   npm run build:all
 *
 * Start:  npm run pm2:start
 * Stop:   npm run pm2:stop
 *
 * Production: set JWT_SECRET in properties.env, then:
 *   pm2 start ecosystem.config.cjs --env production
 */
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const ROOT = __dirname;
const envPath = path.join(ROOT, 'properties.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  require(path.join(ROOT, 'scripts/resolve-env-urls.cjs')).applyEnvironmentUrls();
}

const apiPort = process.env.PORT || '3000';
const frontendPort = process.env.FRONTEND_PORT || '3001';
const backendUrl = `http://127.0.0.1:${apiPort}`;
const defaultJwt = 'change-me-in-production';
const jwtSecret = process.env.JWT_SECRET || defaultJwt;
const jwtOkForProduction = jwtSecret && jwtSecret !== defaultJwt;

/** Base env from properties.env (DB, SMTP, ports, etc.) */
const baseEnv = { ...process.env };

/** Respect APP_MODE from properties.env when already set to production. */
const appModeFromFile = baseEnv.APP_MODE === 'production' ? 'production' : 'development';

const localEnv = {
  ...baseEnv,
  NODE_ENV: 'development',
  APP_MODE: appModeFromFile,
  PORT: apiPort,
  FRONTEND_PORT: frontendPort,
  MINI_TM_BACKEND_URL: backendUrl,
};

const productionEnv = {
  ...baseEnv,
  NODE_ENV: 'production',
  APP_MODE: 'production',
  PORT: apiPort,
  FRONTEND_PORT: frontendPort,
  MINI_TM_BACKEND_URL: backendUrl,
};

module.exports = {
  apps: [
    {
      name: 'mini-task-manager',
      cwd: ROOT,
      script: path.join(ROOT, 'app.js'),
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: localEnv,
      env_production: productionEnv,
      error_file: path.join(ROOT, 'logs', 'mini-task-manager-error.log'),
      out_file: path.join(ROOT, 'logs', 'mini-task-manager-out.log'),
      merge_logs: true,
      time: true,
    },
  ],
};

if (!jwtOkForProduction) {
  // eslint-disable-next-line no-console
  console.warn(
    '[ecosystem.config.cjs] JWT_SECRET is default; PM2 uses env (development). ' +
      'For production: set JWT_SECRET in properties.env, then pm2 start ecosystem.config.cjs --env production',
  );
}
