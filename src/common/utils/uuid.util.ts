import { v4 as uuidv4 } from 'uuid';

/**
 * Generates a new UUID v4 string for use as entity id.
 * Use when creating entities with BINARY(16) primary keys; the transformer will convert to Buffer.
 */
export function generateUuid(): string {
  return uuidv4();
}
