import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { uuidBinaryTransformer } from '../../../common/base.entity';
import { SubscriptionEntity } from './subscription.entity';

@Entity('payments')
@Index('idx_payments_subscription_id', ['subscriptionId'])
@Index('idx_payments_razorpay_payment_id', ['razorpayPaymentId'])
export class PaymentEntity {
  @PrimaryColumn({ type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  id!: string;

  @Column({ name: 'subscription_id', type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  subscriptionId!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  @Column({ type: 'varchar', length: 10, default: 'INR' })
  currency!: string;

  @Column({ type: 'varchar', length: 50, default: 'PENDING' })
  status!: string; // PENDING, SUCCESS, FAILED, REFUNDED

  @Column({ name: 'razorpay_payment_id', type: 'varchar', length: 255, nullable: true })
  razorpayPaymentId!: string | null;

  @Column({ name: 'razorpay_order_id', type: 'varchar', length: 255, nullable: true })
  razorpayOrderId!: string | null;

  @Column({ name: 'razorpay_signature', type: 'varchar', length: 500, nullable: true })
  razorpaySignature!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  method!: string | null; // card, upi, netbanking, wallet

  @Column({ type: 'json', nullable: true })
  metadata!: Record<string, unknown> | null;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt!: Date | null;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @ManyToOne(() => SubscriptionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subscription_id' })
  subscription?: SubscriptionEntity;
}
