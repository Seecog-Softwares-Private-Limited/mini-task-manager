import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { parseRazorpayFailure, RazorpayService } from '../modules/billing/razorpay.service';
import { PLANS, type UserPlanSlug } from '../config/plans.config';
import { PlanConfigurationsRepository } from './repositories/plan-configurations.repository';

export interface UserPlanOrderResult {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  amountInr: number;
}

export interface UserPlanSubscriptionResult {
  subscriptionId: string;
  customerId: string | null;
  razorpayPlanId: string;
  amount: number;
  currency: string;
  keyId: string;
  amountInr: number;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly razorpayService: RazorpayService,
    private readonly planConfigurationsRepository: PlanConfigurationsRepository,
  ) {}

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

  verifyUserPlanSubscription(params: {
    subscriptionId: string;
    paymentId: string;
    signature: string;
  }): boolean {
    return this.razorpayService.verifySubscriptionSignature(params);
  }

  /**
   * Recurring monthly Razorpay subscription for Silver / Gold (Android + web IAP).
   * Coupons that change the price still use a one-time order.
   */
  async createUserPlanSubscription(params: {
    userId: string;
    plan: UserPlanSlug;
    amountInr: number;
    name: string;
    email: string;
    contact?: string | null;
    couponCode?: string;
  }): Promise<UserPlanSubscriptionResult> {
    const amountPaise = Math.max(100, Math.round(params.amountInr * 100));
    try {
      const razorpayPlanId = await this.ensureRazorpayPlan(params.plan, amountPaise);
      const customer = await this.razorpayService.createCustomer({
        name: params.name || 'OpsPick user',
        email: params.email,
        contact: params.contact?.replace(/\D/g, '') || undefined,
        notes: { userId: params.userId, plan: params.plan },
      });
      const subscription = await this.razorpayService.createSubscription({
        planId: razorpayPlanId,
        customerId: customer.id,
        totalCount: 120,
        notes: {
          type: 'user_plan_subscription',
          userId: params.userId,
          plan: params.plan,
          couponCode: params.couponCode?.trim() || '',
        },
      });
      return {
        subscriptionId: subscription.id,
        customerId: customer.id,
        razorpayPlanId,
        amount: amountPaise,
        currency: 'INR',
        keyId: this.razorpayService.getKeyId(),
        amountInr: params.amountInr,
      };
    } catch (err: unknown) {
      const parsed = parseRazorpayFailure(err);
      this.logger.error(`createUserPlanSubscription failed: ${parsed.message}`);
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

  private envPlanId(plan: UserPlanSlug): string {
    if (plan === 'silver') return (process.env.RAZORPAY_PLAN_SILVER || '').trim();
    if (plan === 'gold') return (process.env.RAZORPAY_PLAN_GOLD || '').trim();
    return '';
  }

  private async ensureRazorpayPlan(plan: UserPlanSlug, amountPaise: number): Promise<string> {
    const fromEnv = this.envPlanId(plan);
    if (fromEnv) return fromEnv;

    const row = await this.planConfigurationsRepository.findByPlanName(plan);
    if (row?.razorpayPlanId) {
      try {
        const existing = await this.razorpayService.fetchPlan(row.razorpayPlanId);
        const existingAmount = Number(existing.item?.amount ?? 0);
        if (!existingAmount || existingAmount === amountPaise) {
          return row.razorpayPlanId;
        }
      } catch {
        this.logger.warn(`Stored Razorpay plan ${row.razorpayPlanId} is missing; creating a new one`);
      }
    }

    const def = PLANS[plan];
    const created = await this.razorpayService.createPlan({
      name: `OpsPick ${def.name}`,
      amountPaise,
      description: `OpsPick ${def.name} monthly subscription`,
    });

    if (row) {
      try {
        await this.planConfigurationsRepository.upsert(plan, {
          maxUsers: row.maxUsers,
          maxStorage: row.maxStorage,
          maxWorkspaces: row.maxWorkspaces,
          allowCoupon: row.allowCoupon,
          priceMonthlyInr: row.priceMonthlyInr,
          razorpayPlanId: created.id,
        });
      } catch (err) {
        this.logger.warn(
          `Could not persist Razorpay plan id (run migrations): ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    return created.id;
  }

  fetchSubscription(subscriptionId: string) {
    return this.razorpayService.fetchSubscription(subscriptionId);
  }

  cancelSubscription(subscriptionId: string, cancelAtCycleEnd = false) {
    return this.razorpayService.cancelSubscription(subscriptionId, cancelAtCycleEnd);
  }

  /** Activate paid plan for one billing month. */
  activatePlanDurationMonths = 1;

  getKeyId(): string {
    return this.razorpayService.getKeyId();
  }

  getPlanExpiryFromNow(): Date {
    const d = new Date();
    d.setMonth(d.getMonth() + this.activatePlanDurationMonths);
    return d;
  }
}
