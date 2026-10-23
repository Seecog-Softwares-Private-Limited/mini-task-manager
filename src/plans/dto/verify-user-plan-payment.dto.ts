import { IsIn, IsOptional, IsString, ValidateIf } from 'class-validator';
import type { UserPlanSlug } from '../../config/plans.config';

export class VerifyUserPlanPaymentDto {
  @IsIn(['silver', 'gold'])
  plan!: UserPlanSlug;

  @ValidateIf((o: VerifyUserPlanPaymentDto) => !o.razorpay_subscription_id)
  @IsString()
  razorpay_order_id?: string;

  @ValidateIf((o: VerifyUserPlanPaymentDto) => !o.razorpay_order_id)
  @IsOptional()
  @IsString()
  razorpay_subscription_id?: string;

  @IsString()
  razorpay_payment_id!: string;

  @IsString()
  razorpay_signature!: string;

  @IsOptional()
  @IsString()
  couponCode?: string;
}
