import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { BaseEntity, uuidBinaryTransformer } from '../../common/base.entity';
import type { UserPlanSlug } from '../../config/plans.config';

@Entity('coupon_codes')
@Index('ux_coupon_codes_code', ['code'], { unique: true })
export class CouponCodeEntity extends BaseEntity {
  @PrimaryColumn({ type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  id!: string;

  @Column({ type: 'varchar', length: 40 })
  code!: string;

  @Column({ name: 'discount_percent', type: 'tinyint', unsigned: true })
  discountPercent!: number;

  @Column({ name: 'applicable_plans', type: 'json' })
  applicablePlans!: UserPlanSlug[];

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'max_redemptions', type: 'int', unsigned: true, nullable: true })
  maxRedemptions!: number | null;

  @Column({ name: 'redemption_count', type: 'int', unsigned: true, default: 0 })
  redemptionCount!: number;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt!: Date | null;

  @Column({
    name: 'created_by',
    type: 'binary',
    length: 16,
    nullable: true,
    transformer: uuidBinaryTransformer,
  })
  createdBy!: string | null;
}
