import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  planId!: string;

  @IsString()
  @IsIn(['monthly', 'yearly'])
  billingCycle!: 'monthly' | 'yearly';
}

export class VerifyPaymentDto {
  @IsString()
  @IsNotEmpty()
  razorpay_order_id!: string;

  @IsString()
  @IsNotEmpty()
  razorpay_payment_id!: string;

  @IsString()
  @IsNotEmpty()
  razorpay_signature!: string;

  @IsString()
  @IsNotEmpty()
  planId!: string;

  @IsString()
  @IsIn(['monthly', 'yearly'])
  billingCycle!: 'monthly' | 'yearly';
}

export class StartTrialDto {
  @IsString()
  @IsOptional()
  planId?: string;
}

export class CancelSubscriptionDto {
  @IsString()
  @IsOptional()
  reason?: string;
}
