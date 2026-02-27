import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { uuidBinaryTransformer } from '../../../common/base.entity';
import { OrganizationEntity } from '../../organizations/entities/organization.entity';
import { PlanEntity } from './plan.entity';

export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PAST_DUE';
export type BillingCycle = 'monthly' | 'yearly';

@Entity('subscriptions')
@Index('idx_subscriptions_organization_id', ['organizationId'])
export class SubscriptionEntity {
  @PrimaryColumn({ type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  id!: string;

  @Column({ name: 'organization_id', type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  organizationId!: string;

  @Column({ name: 'plan_id', type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  planId!: string;

  @Column({ name: 'billing_cycle', type: 'varchar', length: 20, default: 'monthly' })
  billingCycle!: BillingCycle;

  @Column({ type: 'varchar', length: 50, default: 'TRIAL' })
  status!: SubscriptionStatus;

  @Column({ name: 'start_date', type: 'timestamp', nullable: true })
  startDate!: Date | null;

  @Column({ name: 'end_date', type: 'timestamp', nullable: true })
  endDate!: Date | null;

  @Column({ name: 'trial_ends_at', type: 'timestamp', nullable: true })
  trialEndsAt!: Date | null;

  @Column({ name: 'razorpay_subscription_id', type: 'varchar', length: 255, nullable: true })
  razorpaySubscriptionId!: string | null;

  @Column({ name: 'razorpay_customer_id', type: 'varchar', length: 255, nullable: true })
  razorpayCustomerId!: string | null;

  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt!: Date | null;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt!: Date;

  @ManyToOne(() => OrganizationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization?: OrganizationEntity;

  @ManyToOne(() => PlanEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'plan_id' })
  plan?: PlanEntity;
}
