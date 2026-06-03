import { IsIn, IsOptional, IsString } from 'class-validator';
import type { UserPlanSlug } from '../../config/plans.config';

export class UpgradePlanDto {
  @IsIn(['silver', 'gold'])
  plan!: UserPlanSlug;

  @IsOptional()
  @IsString()
  paymentId?: string;

  @IsOptional()
  @IsString()
  couponCode?: string;
}
