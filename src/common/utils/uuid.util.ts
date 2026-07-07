import { v4 as uuidv4 } from 'uuid';

/**
 * Generates a new UUID v4 string for use as entity id.
 * Use when creating entities with BINARY(16) primary keys; the transformer will convert to Buffer.
 */
export function generateUuid(): string {
  return uuidv4();
}

/** BINARY(16) columns may surface as Buffer on freshly saved entities before a reload. */
export function formatUuid(value: string | Buffer | null | undefined): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (Buffer.isBuffer(value)) {
    const hex = value.toString('hex');
    if (hex.length !== 32) return undefined;
    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20, 32),
    ].join('-');
  }
  return undefined;
}

/** Compare assignee/user IDs reliably across dashed UUIDs, casing, and Buffer-backed values. */
export function normalizeUserIdForCompare(
  id: string | Buffer | null | undefined,
): string | null {
  const formatted = formatUuid(id);
  if (formatted) return formatted.toLowerCase();
  const trimmed = String(id ?? '').trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}
