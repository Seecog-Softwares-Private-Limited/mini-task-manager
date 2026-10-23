import {
  Entity,
  PrimaryColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { uuidBinaryTransformer } from '../../common/base.entity';

export type RazorpaySubscriptionStatus =
  | 'created'
  | 'authenticated'
  | 'active'
  | 'pending'
  | 'halted'
  | 'cancelled'
  | 'completed'
  | 'expired';

@Entity('razorpay_subscriptions')
export class RazorpaySubscriptionEntity {
  @PrimaryColumn({ type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  id!: string;

  @Index()
  @Column({ name: 'user_id', type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  userId!: string;

  @Column({ name: 'plan_slug', type: 'varchar', length: 20 })
  planSlug!: string;

  @Index({ unique: true })
  @Column({ name: 'razorpay_subscription_id', type: 'varchar', length: 64 })
  razorpaySubscriptionId!: string;

  @Column({ name: 'razorpay_customer_id', type: 'varchar', length: 64, nullable: true })
  razorpayCustomerId!: string | null;

  @Column({ name: 'razorpay_plan_id', type: 'varchar', length: 64 })
  razorpayPlanId!: string;

  @Column({ name: 'status', type: 'varchar', length: 32, default: 'created' })
  status!: RazorpaySubscriptionStatus;

  @Column({ name: 'latest_payment_id', type: 'varchar', length: 64, nullable: true })
  latestPaymentId!: string | null;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt!: Date | null;

  @Column({ name: 'purchased_at', type: 'timestamp', nullable: true })
  purchasedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
