import { IsIn, IsOptional, IsString } from 'class-validator';
import type { UserPlanSlug } from '../../config/plans.config';

export class VerifyUserPlanPaymentDto {
  @IsIn(['silver', 'gold'])
  plan!: UserPlanSlug;

  @IsString()
  razorpay_order_id!: string;

  @IsString()
  razorpay_payment_id!: string;

  @IsString()
  razorpay_signature!: string;

  @IsOptional()
  @IsString()
  couponCode?: string;
}
