/**
 * Validates loaded configuration. Receives the object returned by configuration() (camelCase).
 * Enforces production-required vars (JWT_SECRET) and returns the config for Nest to use.
 */
function isLocalhostUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === 'localhost' || host === '127.0.0.1';
  } catch {
    return /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(url);
  }
}

export function validate(config: Record<string, unknown>) {
  const loaded = config as {
    nodeEnv?: string;
    frontendUrl?: string;
    jwt?: { secret?: string };
    database?: { synchronize?: boolean };
  };
  if (loaded?.nodeEnv === 'production') {
    const secret = loaded.jwt?.secret;
    if (!secret || secret === 'change-me-in-production') {
      throw new Error(
        'JWT_SECRET must be set to a non-default value in production. Refusing to start.',
      );
    }
    if (loaded.database?.synchronize === true) {
      throw new Error(
        'DB_SYNCHRONIZE must not be true in production. Use migrations instead. Refusing to start.',
      );
    }
    const frontendUrl = loaded.frontendUrl?.trim();
    if (!frontendUrl || isLocalhostUrl(frontendUrl)) {
      throw new Error(
        'FRONTEND_URL must be set to your public app URL in production (e.g. http://3.110.214.243:3000). ' +
          'Invite, verification, and password-reset emails use this value. Refusing to start.',
      );
    }
  }
  return config;
}
