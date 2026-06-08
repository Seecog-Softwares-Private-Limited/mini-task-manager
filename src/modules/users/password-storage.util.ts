import * as bcrypt from 'bcrypt';

const DEFAULT_BCRYPT_ROUNDS = 12;

/** Salt rounds for bcrypt (env BCRYPT_ROUNDS, default 12). */
export function getBcryptRounds(): number {
  const parsed = parseInt(process.env.BCRYPT_ROUNDS ?? String(DEFAULT_BCRYPT_ROUNDS), 10);
  if (!Number.isFinite(parsed) || parsed < 10 || parsed > 15) {
    return DEFAULT_BCRYPT_ROUNDS;
  }
  return parsed;
}

/** True when value looks like a bcrypt hash. */
export function isAlreadyHashed(password: string): boolean {
  return (
    password.startsWith('$2b$') ||
    password.startsWith('$2a$') ||
    password.startsWith('$2y$')
  );
}

/** Hash a plain password with bcrypt. Never store the return value in logs. */
export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, getBcryptRounds());
}

/** Compare plain password to stored bcrypt hash. Returns false for empty stored value. */
export async function verifyPassword(
  plainPassword: string,
  hashedPassword: string,
): Promise<boolean> {
  if (!hashedPassword) return false;
  if (isAlreadyHashed(hashedPassword)) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
  // Legacy plain-text rows (pre-migration) — still verify, then run migrate-passwords script.
  return plainPassword === hashedPassword;
}

/** Hash password before DB storage. */
export async function toStoredPassword(plainPassword: string): Promise<string> {
  return hashPassword(plainPassword);
}

export async function verifyPasswordAgainstStored(
  plainPassword: string,
  stored: string | null,
): Promise<boolean> {
  if (stored == null || stored === '') return false;
  return verifyPassword(plainPassword, stored);
}
