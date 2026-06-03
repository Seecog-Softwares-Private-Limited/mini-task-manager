import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { BaseEntity, uuidBinaryTransformer } from '../../common/base.entity';
import type { UserPlanSlug } from '../../config/plans.config';

@Entity('coupon_redemptions')
@Index('idx_coupon_redemptions_coupon', ['couponId'])
@Index('idx_coupon_redemptions_user', ['userId'])
export class CouponRedemptionEntity extends BaseEntity {
  @PrimaryColumn({ type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  id!: string;

  @Column({
    name: 'coupon_id',
    type: 'binary',
    length: 16,
    transformer: uuidBinaryTransformer,
  })
  couponId!: string;

  @Column({
    name: 'user_id',
    type: 'binary',
    length: 16,
    transformer: uuidBinaryTransformer,
  })
  userId!: string;

  @Column({ name: 'plan_name', type: 'varchar', length: 20 })
  planName!: UserPlanSlug;

  @Column({ name: 'discount_percent', type: 'tinyint', unsigned: true })
  discountPercent!: number;

  @Column({ name: 'original_amount_inr', type: 'decimal', precision: 10, scale: 2 })
  originalAmountInr!: string;

  @Column({ name: 'final_amount_inr', type: 'decimal', precision: 10, scale: 2 })
  finalAmountInr!: string;
}
