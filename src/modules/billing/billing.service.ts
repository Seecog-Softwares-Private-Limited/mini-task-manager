import {
  Injectable,
  NotFoundException,
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PlansRepository } from './repositories/plans.repository';
import { SubscriptionsRepository } from './repositories/subscriptions.repository';
import { InvoicesRepository } from './repositories/invoices.repository';
import { PaymentsRepository } from './repositories/payments.repository';
import { parseRazorpayFailure, RazorpayService } from './razorpay.service';
import { UsageService, type OrganizationUsage } from './usage.service';
import { PlanEntity } from './entities/plan.entity';
import { SubscriptionEntity, type BillingCycle } from './entities/subscription.entity';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly plansRepository: PlansRepository,
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly invoicesRepository: InvoicesRepository,
    private readonly paymentsRepository: PaymentsRepository,
    private readonly razorpayService: RazorpayService,
    private readonly usageService: UsageService,
  ) {}

  // ── Plans ──

  async getPlans(): Promise<PlanEntity[]> {
    return this.plansRepository.findActive();
  }

  async getPlanById(planId: string): Promise<PlanEntity | null> {
    return this.plansRepository.findById(planId);
  }

  async getPlanBySlug(slug: string): Promise<PlanEntity | null> {
    return this.plansRepository.findBySlug(slug);
  }

  // ── Subscriptions ──

  async getSubscriptionForOrganization(organizationId: string): Promise<SubscriptionEntity | null> {
    return this.subscriptionsRepository.findByOrganization(organizationId);
  }

  // ── Usage ──

  async getUsage(organizationId: string): Promise<OrganizationUsage> {
    return this.usageService.getOrganizationUsage(organizationId);
  }

  async getFeatureFlags(organizationId: string): Promise<Record<string, unknown>> {
    return this.usageService.getFeatureFlags(organizationId);
  }

  // ── Trial ──

  async startTrial(organizationId: string, planSlug = 'pro'): Promise<SubscriptionEntity> {
    const existing = await this.subscriptionsRepository.findByOrganization(organizationId);
    const plan = await this.plansRepository.findBySlug(planSlug);

    // Block if already in an active trial
    if (existing?.status === 'TRIAL') {
      throw new BadRequestException('You already have an active trial.');
    }

    // Block if on a paid plan (pro/enterprise) — they already have a subscription
    if (existing?.status === 'ACTIVE') {
      const currentPlan = existing.plan ?? (existing.planId ? await this.plansRepository.findById(existing.planId) : null);
      const isOnFreePlan = currentPlan?.slug === 'free';
      if (!isOnFreePlan) {
        throw new BadRequestException('You already have an active subscription.');
      }
    }

    // EXPIRED or ACTIVE on free: allow trial
    if (!plan) throw new NotFoundException('Plan not found');

    const now = new Date();
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + 14); // 14-day trial

    if (existing) {
      // Clear stale relation so TypeORM uses the updated planId column
      existing.plan = undefined;
      existing.planId = plan.id;
      existing.status = 'TRIAL';
      existing.billingCycle = 'monthly';
      existing.startDate = now;
      existing.trialEndsAt = trialEnd;
      existing.endDate = trialEnd;
      existing.cancelledAt = null;
      return this.subscriptionsRepository.save(existing);
    }

    return this.subscriptionsRepository.create({
      organizationId,
      planId: plan.id,
      billingCycle: 'monthly',
      status: 'TRIAL',
      startDate: now,
      trialEndsAt: trialEnd,
      endDate: trialEnd,
    });
  }

  // ── Razorpay Order Creation ──

  async createOrder(organizationId: string, planId: string, billingCycle: BillingCycle): Promise<{
    orderId: string;
    amount: number;
    currency: string;
    keyId: string;
    planName: string;
    billingCycle: string;
  }> {
    const plan = await this.plansRepository.findById(planId);
    if (!plan) throw new NotFoundException('Plan not found');
    if (!plan.isActive) throw new BadRequestException('Plan is not available');
    if (plan.slug === 'free') throw new BadRequestException('Free plan does not require payment');

    const price = billingCycle === 'yearly' ? Number(plan.priceYearly) : Number(plan.priceMonthly);
    if (price <= 0) throw new BadRequestException('Invalid plan price');

    // Get user count for this org
    const usage = await this.usageService.getOrganizationUsage(organizationId);
    const userCount = Math.max(1, usage.users.current);
    const totalAmount = Math.round(price * userCount * 100); // Convert to paise

    // Razorpay receipt max length 40; must be unique per account
    const orgShort = organizationId.replace(/-/g, '').slice(0, 8);
    const receipt = `sub_${orgShort}_${Date.now()}`.slice(0, 40);

    let order: { id: string };
    try {
      order = await this.razorpayService.createOrder({
        amount: totalAmount,
        currency: plan.currency || 'INR',
        receipt,
        notes: {
          organizationId,
          planId,
          billingCycle,
          planName: plan.name,
          userCount: String(userCount),
        },
      });
    } catch (err: unknown) {
      const parsed = parseRazorpayFailure(err);
      const statusFromErr =
        err && typeof err === 'object' && typeof (err as { statusCode?: number }).statusCode === 'number'
          ? (err as { statusCode: number }).statusCode
          : parsed.statusCode;
      this.logger.warn(`createOrder Razorpay failure: ${parsed.message} (http ${statusFromErr ?? 'n/a'})`);
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_GATEWAY,
          error: 'RazorpayError',
          message: parsed.message,
          hint:
            'Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env using Test keys from https://dashboard.razorpay.com/app/keys (fallback keys in repo are often revoked).',
        },
        HttpStatus.BAD_GATEWAY,
      );
    }

    // Create a pending payment record
    const subscription = await this.subscriptionsRepository.findByOrganization(organizationId);
    if (subscription) {
      try {
        await this.paymentsRepository.create({
          subscriptionId: subscription.id,
          amount: Math.round((totalAmount / 100) * 100) / 100,
          currency: plan.currency || 'INR',
          status: 'PENDING',
          razorpayOrderId: order.id,
          metadata: { planId, billingCycle, userCount },
        });
      } catch (dbErr) {
        this.logger.error(
          `Payment row insert failed after Razorpay order ${order.id}; order may be orphaned`,
          dbErr instanceof Error ? dbErr.stack : String(dbErr),
        );
        throw new HttpException(
          {
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            error: 'PaymentRecordError',
            message: 'Razorpay order was created but saving the pending payment failed.',
            orderId: order.id,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }

    return {
      orderId: order.id,
      amount: totalAmount,
      currency: plan.currency || 'INR',
      keyId: this.razorpayService.getKeyId(),
      planName: plan.name,
      billingCycle,
    };
  }

  // ── Payment Verification ──

  async verifyPayment(params: {
    organizationId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    planId: string;
    billingCycle: BillingCycle;
  }): Promise<SubscriptionEntity> {
    // 1. Verify signature
    const isValid = this.razorpayService.verifyPaymentSignature({
      orderId: params.razorpayOrderId,
      paymentId: params.razorpayPaymentId,
      signature: params.razorpaySignature,
    });

    if (!isValid) {
      throw new BadRequestException('Payment verification failed. Invalid signature.');
    }

    // 2. Fetch payment details from Razorpay
    const paymentDetails = await this.razorpayService.fetchPayment(params.razorpayPaymentId);

    // 3. Get the plan
    const plan = await this.plansRepository.findById(params.planId);
    if (!plan) throw new NotFoundException('Plan not found');

    // 4. Calculate end date
    const now = new Date();
    const endDate = new Date(now);
    if (params.billingCycle === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    // 5. Update or create subscription
    let subscription = await this.subscriptionsRepository.findByOrganization(params.organizationId);
    if (subscription) {
      // Clear stale relation so TypeORM uses the updated planId column
      subscription.plan = undefined;
      subscription.planId = params.planId;
      subscription.billingCycle = params.billingCycle;
      subscription.status = 'ACTIVE';
      subscription.startDate = now;
      subscription.endDate = endDate;
      subscription.trialEndsAt = null;
      subscription.cancelledAt = null;
      subscription.razorpaySubscriptionId = params.razorpayPaymentId;
      await this.subscriptionsRepository.save(subscription);
    } else {
      await this.subscriptionsRepository.create({
        organizationId: params.organizationId,
        planId: params.planId,
        billingCycle: params.billingCycle,
        status: 'ACTIVE',
        startDate: now,
        endDate,
        razorpaySubscriptionId: params.razorpayPaymentId,
      });
    }

    // Reload subscription with fresh plan relation so callers see the correct plan
    const reloaded = await this.subscriptionsRepository.findByOrganization(params.organizationId);
    if (!reloaded) {
      throw new NotFoundException('Subscription not found after payment');
    }
    subscription = reloaded;

    // 6. Update payment record
    const payment = await this.paymentsRepository.findByRazorpayOrderId(params.razorpayOrderId);
    if (payment) {
      payment.razorpayPaymentId = params.razorpayPaymentId;
      payment.razorpaySignature = params.razorpaySignature;
      payment.status = 'SUCCESS';
      payment.paidAt = now;
      payment.method = (paymentDetails.method as string) || null;
      payment.metadata = paymentDetails;
      await this.paymentsRepository.save(payment);
    }

    // 7. Create invoice
    const usage = await this.usageService.getOrganizationUsage(params.organizationId);
    const userCount = Math.max(1, usage.users.current);
    const price = params.billingCycle === 'yearly' ? Number(plan.priceYearly) : Number(plan.priceMonthly);
    
    await this.invoicesRepository.create({
      subscriptionId: subscription.id,
      organizationId: params.organizationId,
      amount: price * userCount,
      currency: plan.currency || 'INR',
      status: 'PAID',
      billingCycle: params.billingCycle,
      planName: plan.name,
      userCount,
      paidAt: now,
      razorpayInvoiceId: params.razorpayPaymentId,
    });

    this.logger.log(`Payment verified for org ${params.organizationId}, plan: ${plan.name}, cycle: ${params.billingCycle}`);

    return subscription;
  }

  // ── Downgrade to Free ──

  async downgradeToFree(organizationId: string): Promise<SubscriptionEntity> {
    const freePlan = await this.plansRepository.findBySlug('free');
    if (!freePlan) throw new NotFoundException('Free plan not configured');

    let subscription = await this.subscriptionsRepository.findByOrganization(organizationId);
    const now = new Date();

    if (subscription) {
      // Clear stale relation so TypeORM uses the updated planId column
      subscription.plan = undefined;
      subscription.planId = freePlan.id;
      subscription.status = 'ACTIVE';
      subscription.billingCycle = 'monthly';
      subscription.startDate = now;
      subscription.endDate = null;
      subscription.trialEndsAt = null;
      subscription.cancelledAt = null;
      return this.subscriptionsRepository.save(subscription);
    }

    return this.subscriptionsRepository.create({
      organizationId,
      planId: freePlan.id,
      billingCycle: 'monthly',
      status: 'ACTIVE',
      startDate: now,
    });
  }

  // ── Cancel Subscription ──

  async cancelSubscription(organizationId: string): Promise<SubscriptionEntity> {
    const subscription = await this.subscriptionsRepository.findByOrganization(organizationId);
    if (!subscription) throw new NotFoundException('No subscription found');

    subscription.status = 'CANCELLED';
    subscription.cancelledAt = new Date();
    const updated = await this.subscriptionsRepository.save(subscription);

    // Downgrade to free after cancellation
    return this.downgradeToFree(organizationId);
  }

  /** Platform admin: assign plan without payment (comp / support override). */
  async adminSetOrganizationPlan(
    organizationId: string,
    planId: string,
    options?: { billingCycle?: BillingCycle; status?: SubscriptionEntity['status'] },
  ): Promise<SubscriptionEntity> {
    const plan = await this.plansRepository.findById(planId);
    if (!plan) throw new NotFoundException('Plan not found');

    const now = new Date();
    const billingCycle = options?.billingCycle ?? 'monthly';
    const targetStatus = options?.status ?? (plan.slug === 'free' ? 'ACTIVE' : 'ACTIVE');

    let subscription = await this.subscriptionsRepository.findByOrganization(organizationId);
    if (subscription) {
      subscription.plan = undefined;
      subscription.planId = plan.id;
      subscription.billingCycle = billingCycle;
      subscription.status = targetStatus;
      subscription.startDate = now;
      subscription.trialEndsAt = null;
      subscription.cancelledAt = null;
      if (plan.slug === 'free') {
        subscription.endDate = null;
      } else {
        const endDate = new Date(now);
        if (billingCycle === 'yearly') {
          endDate.setFullYear(endDate.getFullYear() + 1);
        } else {
          endDate.setMonth(endDate.getMonth() + 1);
        }
        subscription.endDate = endDate;
      }
      return this.subscriptionsRepository.save(subscription);
    }

    const endDate = plan.slug === 'free' ? null : new Date(now);
    if (endDate && billingCycle === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else if (endDate) {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    return this.subscriptionsRepository.create({
      organizationId,
      planId: plan.id,
      billingCycle,
      status: targetStatus,
      startDate: now,
      endDate: endDate ?? undefined,
    });
  }

  // ── Invoices ──

  async getInvoicesForOrganization(organizationId: string) {
    return this.invoicesRepository.findByOrganization(organizationId);
  }

  // ── Payments ──

  async getPaymentsForSubscription(subscriptionId: string) {
    return this.paymentsRepository.findBySubscription(subscriptionId);
  }

  // ── Trial Expiry Cron (every hour) ──

  async handleRazorpayWebhook(
    rawBody: string,
    signature: string,
    body: Record<string, unknown>,
  ): Promise<void> {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (secret && signature) {
      const valid = this.razorpayService.verifyWebhookSignature(rawBody, signature, secret);
      if (!valid) {
        throw new BadRequestException('Invalid webhook signature');
      }
    }

    const event = String(body.event ?? '');
    const payload = (body.payload as Record<string, unknown>) ?? {};
    const payment = (payload.payment as { entity?: Record<string, unknown> })?.entity;
    const subscription = (payload.subscription as { entity?: Record<string, unknown> })?.entity;

    if (event === 'payment.captured' && payment?.order_id) {
      const orderId = String(payment.order_id);
      const existing = await this.paymentsRepository.findByRazorpayOrderId(orderId);
      if (existing && existing.status !== 'SUCCESS') {
        existing.razorpayPaymentId = String(payment.id ?? '');
        existing.status = 'SUCCESS';
        existing.paidAt = new Date();
        await this.paymentsRepository.save(existing);
      }
    }

    if (event === 'payment.failed' && payment?.order_id) {
      const orderId = String(payment.order_id);
      const existing = await this.paymentsRepository.findByRazorpayOrderId(orderId);
      if (existing) {
        existing.status = 'FAILED';
        existing.metadata = payment;
        await this.paymentsRepository.save(existing);
      }
    }

    if (event === 'subscription.cancelled' && subscription?.id) {
      const sub = await this.subscriptionsRepository.findByRazorpaySubscriptionId(String(subscription.id));
      if (sub) {
        await this.downgradeToFree(sub.organizationId);
      }
    }

    this.logger.log(`Processed Razorpay webhook: ${event || 'unknown'}`);
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleTrialExpiry() {
    try {
      const expiredTrials = await this.subscriptionsRepository.findExpiredTrials();
      
      for (const sub of expiredTrials) {
        this.logger.log(`Trial expired for org ${sub.organizationId}, downgrading to free`);
        await this.downgradeToFree(sub.organizationId);
      }

      if (expiredTrials.length > 0) {
        this.logger.log(`Processed ${expiredTrials.length} expired trials`);
      }
    } catch (error) {
      this.logger.error('Error processing trial expirations', error);
    }
  }
}
