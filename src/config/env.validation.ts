/**
 * Validates loaded configuration. Receives the object returned by configuration() (camelCase).
 * Enforces production-required vars (JWT_SECRET) and returns the config for Nest to use.
 */
export function validate(config: Record<string, unknown>) {
  const loaded = config as {
    nodeEnv?: string;
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
  }
  return config;
}
