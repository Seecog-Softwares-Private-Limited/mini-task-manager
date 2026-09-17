const DEFAULT_JWT_SECRET = 'change-me-in-production';
import { join } from 'path';
import { resolveFrontendPublicUrl } from '../common/utils/frontend-url.util';
import { resolveSmtpHost, resolveSmtpPort, resolveSmtpProvider } from './smtp.config';

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

  const smtpHost = resolveSmtpHost();
  const smtpPort = resolveSmtpPort(smtpHost);

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
      from: process.env.SMTP_FROM || 'noreply@opspick.com',
      provider: resolveSmtpProvider(smtpHost, smtpPort),
      region: process.env.AWS_SES_REGION?.trim() || undefined,
      /** When true (default), verify SMTP on startup and log failures. */
      verifyOnStartup: String(process.env.SMTP_VERIFY_ON_STARTUP ?? 'true').toLowerCase() !== 'false',
      fallback: process.env.SMTP_FALLBACK_HOST?.trim()
        ? {
            host: process.env.SMTP_FALLBACK_HOST.trim(),
            port: parseInt(process.env.SMTP_FALLBACK_PORT || '587', 10),
            user: process.env.SMTP_FALLBACK_USER || '',
            pass: process.env.SMTP_FALLBACK_PASS || '',
            from: process.env.SMTP_FALLBACK_FROM || process.env.SMTP_FROM || 'noreply@opspick.com',
          }
        : undefined,
    },
    uploadsPath: process.env.UPLOADS_PATH || join(process.cwd(), 'uploads'),
    /**
     * When local Nest shares a remote DB with production, uploads land on the
     * local disk only. Set PUBLIC_API_URL (+ optional UPLOADS_MIRROR_SECRET) so
     * new files are also written on the VPS for mobile clients.
     */
    publicApiUrl: (process.env.PUBLIC_API_URL || '').replace(/\/$/, ''),
    uploadsMirrorSecret:
      process.env.UPLOADS_MIRROR_SECRET?.trim() ||
      (process.env.JWT_SECRET ? `mirror:${process.env.JWT_SECRET}` : ''),
    jwt: {
      secret: jwtSecret,
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },
    throttle: {
      auth: {
        ttl: parseInt(process.env.THROTTLE_AUTH_TTL_MS || '60000', 10),
        limit: parseInt(process.env.THROTTLE_AUTH_LIMIT || '1000000', 10),
      },
      general: {
        ttl: parseInt(process.env.THROTTLE_GENERAL_TTL_MS || '60000', 10),
        limit: parseInt(process.env.THROTTLE_GENERAL_LIMIT || '1000000', 10),
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
      // Keep RDS / remote MySQL connections alive to reduce ECONNRESET on idle pool sockets.
      enableKeepAlive: true,
      keepAliveInitialDelay: parseInt(process.env.DB_KEEPALIVE_MS || '10000', 10),
    },
  },
  firebase: {
    /** Absolute or cwd-relative path to service account JSON. */
    serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '',
    /** Optional raw JSON string (useful for secrets managers). */
    serviceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '',
  },
  appleIap: {
    bundleId:
      process.env.APPLE_IAP_BUNDLE_ID ||
      'com.seecog.minitaskmanager.miniTaskManager',
    issuerId: process.env.APPLE_IAP_ISSUER_ID || '',
    keyId: process.env.APPLE_IAP_KEY_ID || '',
    privateKey: process.env.APPLE_IAP_PRIVATE_KEY || '',
    privateKeyPath: process.env.APPLE_IAP_PRIVATE_KEY_PATH || '',
    environment: process.env.APPLE_IAP_ENVIRONMENT || 'Sandbox',
    fallbackSandbox:
      String(process.env.APPLE_IAP_FALLBACK_SANDBOX ?? 'true').toLowerCase() !==
      'false',
  },
  };
};

export type Configuration = ReturnType<typeof configuration>;
