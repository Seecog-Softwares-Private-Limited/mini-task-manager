import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { uuidBinaryTransformer } from '../../../common/base.entity';
import { SubscriptionEntity } from './subscription.entity';

@Entity('invoices')
@Index('idx_invoices_subscription_id', ['subscriptionId'])
export class InvoiceEntity {
  @PrimaryColumn({ type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  id!: string;

  @Column({ name: 'subscription_id', type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  subscriptionId!: string;

  @Column({ name: 'organization_id', type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  organizationId!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  @Column({ type: 'varchar', length: 10, default: 'INR' })
  currency!: string;

  @Column({ type: 'varchar', length: 50, default: 'UNPAID' })
  status!: string; // UNPAID, PAID, FAILED, REFUNDED

  @Column({ name: 'billing_cycle', type: 'varchar', length: 20 })
  billingCycle!: string;

  @Column({ name: 'plan_name', type: 'varchar', length: 100 })
  planName!: string;

  @Column({ name: 'user_count', type: 'int', default: 1 })
  userCount!: number;

  @Column({ name: 'razorpay_invoice_id', type: 'varchar', length: 255, nullable: true })
  razorpayInvoiceId!: string | null;

  @Column({ name: 'issued_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  issuedAt!: Date;

  @Column({ name: 'due_date', type: 'timestamp', nullable: true })
  dueDate!: Date | null;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt!: Date | null;

  @ManyToOne(() => SubscriptionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subscription_id' })
  subscription?: SubscriptionEntity;
}
