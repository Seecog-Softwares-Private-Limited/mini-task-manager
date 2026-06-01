/**
 * PM2 config for mini-task-manager.
 *
 * Prereqs:
 *   npm run build:all
 *
 * Start:  npm run pm2:start
 * Stop:   npm run pm2:stop
 *
 * Production: set JWT_SECRET in properties.env to a non-default value, then:
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

const localEnv = {
  ...baseEnv,
  NODE_ENV: 'development',
  APP_MODE: 'development',
  PORT: apiPort,
  MINI_TM_BACKEND_URL: backendUrl,
};

const productionEnv = {
  ...baseEnv,
  NODE_ENV: 'production',
  APP_MODE: 'production',
  PORT: apiPort,
  MINI_TM_BACKEND_URL: backendUrl,
};

module.exports = {
  apps: [
    {
      name: 'mini-task-manager-api',
      cwd: ROOT,
      script: path.join(ROOT, 'dist', 'main.js'),
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: localEnv,
      env_production: productionEnv,
      error_file: path.join(ROOT, 'logs', 'api-error.log'),
      out_file: path.join(ROOT, 'logs', 'api-out.log'),
      merge_logs: true,
      time: true,
    },
    {
      name: 'mini-task-manager-web',
      cwd: path.join(ROOT, 'frontend'),
      script: path.join(ROOT, 'frontend', 'node_modules', 'next', 'dist', 'bin', 'next'),
      args: ['start', '-p', String(frontendPort)],
      interpreter: 'node',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '768M',
      env: {
        ...localEnv,
        PORT: frontendPort,
      },
      env_production: {
        ...productionEnv,
        PORT: frontendPort,
      },
      error_file: path.join(ROOT, 'logs', 'web-error.log'),
      out_file: path.join(ROOT, 'logs', 'web-out.log'),
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
