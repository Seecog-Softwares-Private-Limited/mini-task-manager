import {
  Entity,
  PrimaryColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { uuidBinaryTransformer } from '../../common/base.entity';

export type AppleSubscriptionStatus =
  | 'active'
  | 'expired'
  | 'revoked'
  | 'refunded';

@Entity('apple_subscriptions')
export class AppleSubscriptionEntity {
  @PrimaryColumn({ type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  id!: string;

  @Index()
  @Column({ name: 'user_id', type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  userId!: string;

  @Column({ name: 'product_id', type: 'varchar', length: 128 })
  productId!: string;

  @Column({ name: 'plan_slug', type: 'varchar', length: 20 })
  planSlug!: string;

  @Index({ unique: true })
  @Column({ name: 'original_transaction_id', type: 'varchar', length: 64 })
  originalTransactionId!: string;

  @Column({ name: 'latest_transaction_id', type: 'varchar', length: 64 })
  latestTransactionId!: string;

  @Column({ name: 'environment', type: 'varchar', length: 32, nullable: true })
  environment!: string | null;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 20,
    default: 'active',
  })
  status!: AppleSubscriptionStatus;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt!: Date | null;

  @Column({ name: 'purchased_at', type: 'timestamp', nullable: true })
  purchasedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
