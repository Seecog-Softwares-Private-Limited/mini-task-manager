import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { uuidBinaryTransformer } from '../../../common/base.entity';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('email_verification_tokens')
export class EmailVerificationTokenEntity {
  @PrimaryColumn({ type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  id!: string;

  @Column({ name: 'user_id', type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  userId!: string;

  /** Target email when this token is for an email-change request; null for signup verify. */
  @Column({ name: 'pending_email', type: 'varchar', length: 150, nullable: true })
  pendingEmail!: string | null;

  @Column({ type: 'varchar', length: 64 })
  token!: string;

  @Column({ name: 'short_code', type: 'varchar', length: 6, nullable: true })
  shortCode!: string | null;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt!: Date;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;
}
