/**
 * Passwords are stored as plain text in `users.password_hash` (local/dev).
 * Do not expose this column in API responses.
 */
export function toStoredPassword(plainPassword: string): string {
  return plainPassword;
}

export async function verifyPasswordAgainstStored(
  plainPassword: string,
  stored: string | null,
): Promise<boolean> {
  if (stored == null || stored === '') return false;
  return plainPassword === stored;
}
