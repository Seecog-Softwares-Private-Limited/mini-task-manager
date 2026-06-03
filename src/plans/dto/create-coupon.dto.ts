import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import type { UserPlanSlug } from '../../config/plans.config';

const PAID_PLANS = ['silver', 'gold'] as const;

export class CreateCouponDto {
  @IsInt()
  @Min(1)
  @Max(99)
  discountPercent!: number;

  @IsArray()
  @ArrayMinSize(1)
  @IsIn(PAID_PLANS, { each: true })
  applicablePlans!: UserPlanSlug[];

  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(40)
  code?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxRedemptions?: number;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
