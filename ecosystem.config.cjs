/**
 * PM2 production config for mini-task-manager.
 *
 * Prereqs:
 *   npm run build              (Nest → dist/)
 *   cd frontend && npm run build && cd ..
 *
 * Start:  pm2 start ecosystem.config.cjs
 * Stop:   pm2 stop ecosystem.config.cjs
 * Logs:   pm2 logs
 */
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const ROOT = __dirname;
const envPath = path.join(ROOT, 'properties.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const apiPort = process.env.PORT || '3000';
const frontendPort = process.env.FRONTEND_PORT || '3001';
const backendUrl = `http://127.0.0.1:${apiPort}`;

const sharedEnv = {
  NODE_ENV: 'production',
  ...process.env,
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
      env: {
        ...sharedEnv,
      },
      error_file: path.join(ROOT, 'logs', 'api-error.log'),
      out_file: path.join(ROOT, 'logs', 'api-out.log'),
      merge_logs: true,
      time: true,
    },
    {
      name: 'mini-task-manager-web',
      cwd: path.join(ROOT, 'frontend'),
      script: 'npm',
      args: ['run', 'start'],
      interpreter: 'none',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '768M',
      env: {
        ...sharedEnv,
        PORT: frontendPort,
        MINI_TM_BACKEND_URL: backendUrl,
      },
      error_file: path.join(ROOT, 'logs', 'web-error.log'),
      out_file: path.join(ROOT, 'logs', 'web-out.log'),
      merge_logs: true,
      time: true,
    },
  ],
};
