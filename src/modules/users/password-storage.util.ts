import * as bcrypt from 'bcrypt';

/**
 * User passwords are stored as plain text in `users.password_hash` for local/dev simplicity.
 * Rows that still contain a bcrypt hash (prefix $2a$/ $2b$/ $2y$) are verified with bcrypt.
 */
export async function verifyPasswordAgainstStored(
  plainPassword: string,
  stored: string | null,
): Promise<boolean> {
  if (stored == null || stored === '') return false;
  if (stored.startsWith('$2a$') || stored.startsWith('$2b$') || stored.startsWith('$2y$')) {
    return bcrypt.compare(plainPassword, stored);
  }
  return plainPassword === stored;
}
