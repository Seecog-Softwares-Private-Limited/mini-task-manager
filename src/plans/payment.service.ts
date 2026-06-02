import { Injectable, Logger } from '@nestjs/common';
import type { UserPlanSlug } from '../config/plans.config';

export interface PaymentInitResult {
  paymentId: string;
  /** Placeholder gateway URL — integrate Razorpay/PayU here. */
  gatewayUrl: string;
  amountInr: number;
  currency: 'INR';
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  /**
   * TODO: Integrate Razorpay/PayU — create order and return checkout URL.
   */
  initiatePayment(userId: string, plan: UserPlanSlug, amountInr: number): PaymentInitResult {
    const paymentId = `pay_${plan}_${userId.slice(0, 8)}_${Date.now()}`;
    this.logger.log(`[Payment placeholder] initiatePayment user=${userId} plan=${plan} amount=₹${amountInr}`);
    return {
      paymentId,
      gatewayUrl: `/dashboard/plans?payment=${paymentId}&plan=${plan}`,
      amountInr,
      currency: 'INR',
    };
  }

  /**
   * TODO: Verify signature with Razorpay/PayU webhook or client callback.
   * Test payments: paymentId starting with `test_pay_` succeed in non-production.
   */
  verifyPayment(paymentId: string): boolean {
    if (!paymentId?.trim()) return false;
    if (paymentId.startsWith('test_pay_')) return true;
    // Placeholder checkout ids from initiatePayment (non-production only)
    if (process.env.NODE_ENV !== 'production' && paymentId.startsWith('pay_')) {
      return true;
    }
    // TODO: Razorpay orders.verify / PayU hash verification
    this.logger.warn(`[Payment placeholder] verifyPayment not integrated for id=${paymentId}`);
    return false;
  }

  /** Activate paid plan for one billing month. */
  activatePlanDurationMonths = 1;

  getPlanExpiryFromNow(): Date {
    const d = new Date();
    d.setMonth(d.getMonth() + this.activatePlanDurationMonths);
    return d;
  }
}
