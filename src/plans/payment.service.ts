import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { parseRazorpayFailure, RazorpayService } from '../modules/billing/razorpay.service';
import type { UserPlanSlug } from '../config/plans.config';

export interface UserPlanOrderResult {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  amountInr: number;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(private readonly razorpayService: RazorpayService) {}

  /**
   * Create a Razorpay order for user-level plan upgrade (Silver / Gold).
   * Amount is in INR; converted to paise for Razorpay (minimum ₹1 / 100 paise).
   */
  async createUserPlanOrder(params: {
    userId: string;
    plan: UserPlanSlug;
    amountInr: number;
    couponCode?: string;
  }): Promise<UserPlanOrderResult> {
    const amountPaise = Math.max(100, Math.round(params.amountInr * 100));
    const userShort = params.userId.replace(/-/g, '').slice(0, 8);
    const receipt = `uplan_${userShort}_${Date.now()}`.slice(0, 40);

    try {
      const order = await this.razorpayService.createOrder({
        amount: amountPaise,
        currency: 'INR',
        receipt,
        notes: {
          type: 'user_plan',
          userId: params.userId,
          plan: params.plan,
          couponCode: params.couponCode?.trim() || '',
          amountInr: String(params.amountInr),
        },
      });

      this.logger.log(
        `User plan Razorpay order ${order.id} user=${params.userId} plan=${params.plan} ₹${params.amountInr}`,
      );

      return {
        orderId: order.id,
        amount: amountPaise,
        currency: order.currency || 'INR',
        keyId: this.razorpayService.getKeyId(),
        amountInr: params.amountInr,
      };
    } catch (err: unknown) {
      const parsed = parseRazorpayFailure(err);
      this.logger.error(`createUserPlanOrder failed: ${parsed.message}`);
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_GATEWAY,
          error: 'RazorpayError',
          message: parsed.message,
          hint:
            'Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env with Test keys from https://dashboard.razorpay.com/app/keys',
        },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  verifyUserPlanPayment(params: {
    orderId: string;
    paymentId: string;
    signature: string;
  }): boolean {
    return this.razorpayService.verifyPaymentSignature({
      orderId: params.orderId,
      paymentId: params.paymentId,
      signature: params.signature,
    });
  }

  /** Activate paid plan for one billing month. */
  activatePlanDurationMonths = 1;

  getPlanExpiryFromNow(): Date {
    const d = new Date();
    d.setMonth(d.getMonth() + this.activatePlanDurationMonths);
    return d;
  }
}
