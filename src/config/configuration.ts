const DEFAULT_JWT_SECRET = 'change-me-in-production';
import { join } from 'path';
import { resolveFrontendPublicUrl } from '../common/utils/frontend-url.util';

export const configuration = () => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const jwtSecret = process.env.JWT_SECRET || DEFAULT_JWT_SECRET;

  if (nodeEnv === 'production') {
    if (!process.env.JWT_SECRET || jwtSecret === DEFAULT_JWT_SECRET) {
      throw new Error(
        'JWT_SECRET must be set to a non-default value in production. Refusing to start.',
      );
    }
  }

  const frontendUrl = resolveFrontendPublicUrl();

  const smtpHost = process.env.SMTP_HOST || 'localhost';
  const smtpPort = parseInt(process.env.SMTP_PORT || '1025', 10);

  return {
    nodeEnv,
    port: parseInt(process.env.PORT ?? '3000', 10),
    apiPrefix: process.env.API_PREFIX || 'api/v1',
    frontendUrl,
    smtp: {
      host: smtpHost,
      port: smtpPort,
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
      from: process.env.SMTP_FROM || 'noreply@minitaskmanager.local',
      /** When true (default), verify SMTP on startup and log failures. */
      verifyOnStartup: String(process.env.SMTP_VERIFY_ON_STARTUP ?? 'true').toLowerCase() !== 'false',
    },
    uploadsPath: process.env.UPLOADS_PATH || join(process.cwd(), 'uploads'),
    jwt: {
      secret: jwtSecret,
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },
    throttle: {
      auth: {
        ttl: parseInt(process.env.THROTTLE_AUTH_TTL_MS || '60000', 10),
        limit: parseInt(process.env.THROTTLE_AUTH_LIMIT || '10', 10),
      },
      general: {
        ttl: parseInt(process.env.THROTTLE_GENERAL_TTL_MS || '60000', 10),
        limit: parseInt(process.env.THROTTLE_GENERAL_LIMIT || '100', 10),
      },
    },
  database: {
    type: 'mysql' as const,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_DATABASE || 'mini_task_manager',
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
    logging: process.env.DB_LOGGING === 'true',
    // Connection pooling for production (e.g. 10K users, multiple app instances)
    extra: {
      connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
      queueLimit: parseInt(process.env.DB_QUEUE_LIMIT || '0', 10) || undefined,
      // Avoid hanging forever when MySQL is down (otherwise login waits indefinitely).
      connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT_MS || '15000', 10),
    },
  },
  };
};

export type Configuration = ReturnType<typeof configuration>;
