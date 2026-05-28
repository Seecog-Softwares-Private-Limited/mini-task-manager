import {
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  type ValueTransformer,
} from 'typeorm';

/**
 * Transforms UUID string to/from BINARY(16) for MySQL 8.0.
 * Use on all id columns that map to BINARY(16).
 */
export const uuidBinaryTransformer: ValueTransformer = {
  to: (value: string | Buffer | null): Buffer | null => {
    if (value == null) return null;
    if (Buffer.isBuffer(value)) return value;
    const hex = String(value).replace(/-/g, '');
    return Buffer.from(hex, 'hex');
  },
  from: (value: Buffer | null): string | null => {
    if (value == null) return null;
    const hex = (value as Buffer).toString('hex');
    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20, 32),
    ].join('-');
  },
};

/**
 * Base entity for tables with created_at and updated_at.
 * Id is not included so each entity can use uuidBinaryTransformer on BINARY(16).
 */
export abstract class BaseEntity {
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt!: Date;
}
