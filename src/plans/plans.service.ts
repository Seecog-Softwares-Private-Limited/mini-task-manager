import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import {
  PLANS,
  PLAN_ORDER,
  buildPlanBenefitsFromLimits,
  formatPlanPriceLabel,
  getPlanDefinition,
  normalizePlanSlug,
  type UserPlanSlug,
} from '../config/plans.config';
import { UserEntity } from '../modules/users/entities/user.entity';
import { PlanLimitService } from './plan-limit.service';
import { PaymentService } from './payment.service';
import { PlanConfigurationsService } from './plan-configurations.service';
import { CouponCodesService } from './coupon-codes.service';
import { VerifyUserPlanPaymentDto } from './dto/verify-user-plan-payment.dto';
import { VerifyApplePurchaseDto } from './dto/verify-apple-purchase.dto';
import { UnifiedBillingService } from '../modules/billing/unified-billing.service';
import { AppleIapService } from './apple-iap.service';
import {
  AppleSubscriptionEntity,
  type AppleSubscriptionStatus,
} from './entities/apple-subscription.entity';
import {
  RazorpaySubscriptionEntity,
  type RazorpaySubscriptionStatus,
} from './entities/razorpay-subscription.entity';

@Injectable()
export class PlansService {
  private readonly logger = new Logger(PlansService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(AppleSubscriptionEntity)
    private readonly appleSubRepo: Repository<AppleSubscriptionEntity>,
    @InjectRepository(RazorpaySubscriptionEntity)
    private readonly razorpaySubRepo: Repository<RazorpaySubscriptionEntity>,
    private readonly planLimitService: PlanLimitService,
    private readonly planConfigurationsService: PlanConfigurationsService,
    private readonly paymentService: PaymentService,
    private readonly couponCodesService: CouponCodesService,
    private readonly unifiedBillingService: UnifiedBillingService,
    private readonly appleIapService: AppleIapService,
  ) {}

  async listPlans() {
    const limitRows = await this.planConfigurationsService.getAll();
    const byPlan = new Map(limitRows.map((row) => [row.planName, row]));
    return PLAN_ORDER.map((slug) => {
      const def = PLANS[slug];
      const limits = byPlan.get(slug) ?? {
        maxWorkspaces: def.limits.maxWorkspaces,
        maxUsers: def.limits.maxMembersPerWorkspace,
        maxStorage: def.limits.storageBytes,
        allowCoupon: slug === 'silver' || slug === 'gold',
        priceMonthlyInr: def.pricing.priceMonthlyInr,
      };
      const resolvedLimits = {
        maxWorkspaces: limits.maxWorkspaces,
        maxMembersPerWorkspace: limits.maxUsers,
        storageBytes: limits.maxStorage,
      };
      const priceMonthlyInr = limits.priceMonthlyInr ?? def.pricing.priceMonthlyInr;
      return {
        slug: def.slug,
        name: def.name,
        price: priceMonthlyInr,
        currency: def.pricing.currency,
        priceLabel: formatPlanPriceLabel(priceMonthlyInr),
        limits: resolvedLimits,
        benefits: buildPlanBenefitsFromLimits({
          maxWorkspaces: resolvedLimits.maxWorkspaces,
          maxMembersPerWorkspace: resolvedLimits.maxMembersPerWorkspace,
          storageBytes: resolvedLimits.storageBytes,
        }),
        allowCoupon: limits.allowCoupon ?? false,
        appleProductId:
          slug === 'silver'
            ? 'opspick.silver.monthly'
            : slug === 'gold'
              ? 'opspick.gold.monthly'
              : null,
      };
    });
  }

  async validateCoupon(userId: string, code: string, plan: UserPlanSlug) {
    return this.couponCodesService.validateForPlan(code, plan, userId);
  }

  async getCurrent(userId: string) {
    return this.planLimitService.getCurrentPlan(userId);
  }

  async getUsage(userId: string, organizationId?: string) {
    const current = await this.planLimitService.getCurrentPlan(userId);
    if (organizationId) {
      const members = await this.planLimitService.getUsageStats(userId, organizationId);
      return { ...current, usage: { ...current.usage, members: members.members } };
    }
    return current;
  }

  private async assertCanUpgrade(userId: string, targetPlan: UserPlanSlug) {
    if (!userId) {
      throw new BadRequestException('Authentication required');
    }
    if (targetPlan === 'free') {
      throw new BadRequestException('Use downgrade endpoint to return to Free');
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const current = this.planLimitService.resolveEffectivePlan(user);
    const targetIdx = PLAN_ORDER.indexOf(targetPlan);
    const currentIdx = PLAN_ORDER.indexOf(current);
    if (targetIdx <= currentIdx) {
      throw new BadRequestException(`Already on ${current} plan or higher`);
    }

    return user;
  }

  private async resolveUpgradePricing(
    userId: string,
    targetPlan: UserPlanSlug,
    couponCode?: string,
  ) {
    const def = getPlanDefinition(targetPlan);
    const config = await this.planConfigurationsService.getByPlanName(targetPlan);
    const originalAmount = config.priceMonthlyInr;
    let amount = originalAmount;
    const normalizedCoupon = couponCode?.trim() || undefined;

    if (normalizedCoupon) {
      const validation = await this.couponCodesService.validateForPlan(
        normalizedCoupon,
        targetPlan,
        userId,
      );
      if (!validation.valid) {
        throw new BadRequestException(validation.message ?? 'Invalid coupon code');
      }
      amount = validation.finalAmountInr;
    }

    return { originalAmount, amount, normalizedCoupon, planName: def.name };
  }

  /** Create Razorpay checkout order for user plan upgrade. */
  async createOrder(userId: string, targetPlan: UserPlanSlug, couponCode?: string) {
    await this.assertCanUpgrade(userId, targetPlan);
    const { originalAmount, amount, normalizedCoupon, planName } =
      await this.resolveUpgradePricing(userId, targetPlan, couponCode);

    if (amount <= 0) {
      if (normalizedCoupon) {
        await this.couponCodesService.redeem(
          normalizedCoupon,
          targetPlan,
          userId,
          originalAmount,
          amount,
        );
      }
      await this.activatePlan(userId, targetPlan, {
        source: 'razorpay',
      });
      return {
        requiresPayment: false,
        plan: targetPlan,
        planExpiresAt: this.paymentService.getPlanExpiryFromNow().toISOString(),
        message: 'Plan activated (100% discount)',
      };
    }

    const useSubscription = amount === originalAmount;
    if (useSubscription) {
      const pending = await this.razorpaySubRepo.find({
        where: {
          userId,
          planSlug: targetPlan,
          status: In(['created', 'authenticated']),
        },
        order: { createdAt: 'DESC' },
      });
      for (const row of pending) {
        try {
          const remote = await this.paymentService.fetchSubscription(
            row.razorpaySubscriptionId,
          );
          const status = this.normalizeRazorpayStatus(String(remote.status ?? ''));
          row.status = status;
          await this.razorpaySubRepo.save(row);
          if (status === 'created' || status === 'authenticated') {
            return {
              requiresPayment: true,
              razorpay: {
                orderId: '',
                subscriptionId: row.razorpaySubscriptionId,
                amount: Math.max(100, Math.round(amount * 100)),
                currency: 'INR',
                keyId: this.paymentService.getKeyId(),
                amountInr: amount,
                planName,
              },
              originalAmountInr: originalAmount,
              finalAmountInr: amount,
              couponApplied: !!normalizedCoupon,
            };
          }
        } catch {
          row.status = 'cancelled';
          await this.razorpaySubRepo.save(row);
        }
      }

      const user = await this.userRepo.findOne({ where: { id: userId } });
      const sub = await this.paymentService.createUserPlanSubscription({
        userId,
        plan: targetPlan,
        amountInr: amount,
        name: user?.fullName || 'OpsPick user',
        email: user?.email || '',
        contact: user?.phone,
        couponCode: normalizedCoupon,
      });
      await this.upsertRazorpaySubscription({
        userId,
        plan: targetPlan,
        subscriptionId: sub.subscriptionId,
        customerId: sub.customerId,
        razorpayPlanId: sub.razorpayPlanId,
        status: 'created',
      });
      return {
        requiresPayment: true,
        razorpay: {
          orderId: '',
          subscriptionId: sub.subscriptionId,
          amount: sub.amount,
          currency: sub.currency,
          keyId: sub.keyId,
          amountInr: sub.amountInr,
          planName,
        },
        originalAmountInr: originalAmount,
        finalAmountInr: amount,
        couponApplied: !!normalizedCoupon,
      };
    }

    const razorpay = await this.paymentService.createUserPlanOrder({
      userId,
      plan: targetPlan,
      amountInr: amount,
      couponCode: normalizedCoupon,
    });

    return {
      requiresPayment: true,
      razorpay: {
        ...razorpay,
        subscriptionId: '',
        planName,
      },
      originalAmountInr: originalAmount,
      finalAmountInr: amount,
      couponApplied: !!normalizedCoupon,
    };
  }

  /** Verify Razorpay payment (subscription or one-time order) and activate. */
  async verifyPayment(userId: string, dto: VerifyUserPlanPaymentDto) {
    await this.assertCanUpgrade(userId, dto.plan);
    const { originalAmount, amount, normalizedCoupon } = await this.resolveUpgradePricing(
      userId,
      dto.plan,
      dto.couponCode,
    );

    const subscriptionId = dto.razorpay_subscription_id?.trim() || '';
    const orderId = dto.razorpay_order_id?.trim() || '';
    if (!subscriptionId && !orderId) {
      throw new BadRequestException('Missing Razorpay order or subscription id');
    }

    const valid = subscriptionId
      ? this.paymentService.verifyUserPlanSubscription({
          subscriptionId,
          paymentId: dto.razorpay_payment_id,
          signature: dto.razorpay_signature,
        })
      : this.paymentService.verifyUserPlanPayment({
          orderId,
          paymentId: dto.razorpay_payment_id,
          signature: dto.razorpay_signature,
        });
    if (!valid) {
      throw new BadRequestException('Payment verification failed — invalid signature');
    }

    if (normalizedCoupon) {
      await this.couponCodesService.redeem(
        normalizedCoupon,
        dto.plan,
        userId,
        originalAmount,
        amount,
      );
    }

    let expiresAt = this.paymentService.getPlanExpiryFromNow();
    if (subscriptionId) {
      expiresAt = await this.activateRazorpaySubscriptionFromPayment({
        userId,
        plan: dto.plan,
        subscriptionId,
        paymentId: dto.razorpay_payment_id,
      });
    } else {
      await this.activatePlan(userId, dto.plan, { source: 'razorpay', expiresAt });
    }

    this.logger.log(
      `User ${userId} upgraded to ${dto.plan} ` +
        `(${subscriptionId ? `sub=${subscriptionId}` : `order=${orderId}`})`,
    );
    return {
      requiresPayment: false,
      plan: dto.plan,
      planExpiresAt: expiresAt.toISOString(),
    };
  }

  /** Razorpay Subscriptions webhooks (charged / cancelled / halted). */
  async handleRazorpaySubscriptionWebhook(body: Record<string, unknown>): Promise<void> {
    const event = String(body.event ?? '');
    if (!event.startsWith('subscription.') && event !== 'payment.captured') {
      return;
    }

    const payload = (body.payload as Record<string, unknown>) ?? {};
    const subscription = (payload.subscription as { entity?: Record<string, unknown> })?.entity;
    const payment = (payload.payment as { entity?: Record<string, unknown> })?.entity;
    const subscriptionId = String(
      subscription?.id ??
        (payment?.subscription_id as string | undefined) ??
        '',
    );
    if (!subscriptionId) return;

    const row = await this.razorpaySubRepo.findOne({
      where: { razorpaySubscriptionId: subscriptionId },
    });
    if (!row) {
      this.logger.warn(`Razorpay subscription webhook for unknown id=${subscriptionId} event=${event}`);
      return;
    }

    const statusRaw = String(subscription?.status ?? row.status);
    const status = this.normalizeRazorpayStatus(statusRaw);
    const currentEnd = Number(subscription?.current_end ?? 0);
    const expiresAt =
      currentEnd > 0 ? new Date(currentEnd * 1000) : row.expiresAt ?? this.paymentService.getPlanExpiryFromNow();
    const paymentId = payment?.id ? String(payment.id) : row.latestPaymentId;

    row.status = status;
    row.expiresAt = expiresAt;
    row.latestPaymentId = paymentId;
    if (!row.purchasedAt && (event === 'subscription.charged' || event === 'subscription.activated')) {
      row.purchasedAt = new Date();
    }
    await this.razorpaySubRepo.save(row);

    const live =
      status === 'active' || status === 'authenticated' || status === 'pending';
    if (live) {
      await this.activatePlan(row.userId, normalizePlanSlug(row.planSlug), {
        source: 'razorpay',
        expiresAt,
      });
    } else {
      await this.recomputeEffectivePlan(row.userId);
    }
    this.logger.log(
      `Razorpay subscription ${subscriptionId} event=${event} status=${status} user=${row.userId}`,
    );
  }

  /** Verify Apple IAP / restore and activate (or keep higher) plan. */
  async verifyApplePurchase(userId: string, dto: VerifyApplePurchaseDto) {
    if (!userId) {
      throw new BadRequestException('Authentication required');
    }
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const verified = await this.appleIapService.verifyTransaction({
      transactionId: dto.transactionId,
      signedTransaction: dto.signedTransaction,
      productId: dto.productId,
    });

    await this.upsertAppleSubscription(userId, verified, 'active');
    const effective = await this.recomputeEffectivePlan(userId);

    this.logger.log(
      `User ${userId} Apple IAP verified product=${verified.productId} ` +
        `tx=${verified.transactionId} effective=${effective.plan}`,
    );

    return {
      requiresPayment: false,
      plan: effective.plan,
      planExpiresAt: effective.planExpiresAt?.toISOString() ?? null,
      appleProductId: verified.productId,
      originalTransactionId: verified.originalTransactionId,
    };
  }

  /** App Store Server Notifications V2. */
  async handleAppleNotification(body: { signedPayload?: string }) {
    const signedPayload = body?.signedPayload?.trim();
    if (!signedPayload) {
      throw new BadRequestException('signedPayload is required');
    }

    const notification = this.appleIapService.decodeNotification(signedPayload);
    const data = notification.data;
    const signedTransactionInfo = data?.signedTransactionInfo;
    if (!signedTransactionInfo) {
      this.logger.warn(
        `Apple ASN ignored (no signedTransactionInfo): type=${notification.notificationType}`,
      );
      return { ok: true, ignored: true };
    }

    const tx = this.appleIapService.decodeSignedTransactionInfo(signedTransactionInfo);
    const originalTransactionId = String(
      tx.originalTransactionId || tx.transactionId || '',
    );
    if (!originalTransactionId) {
      return { ok: true, ignored: true };
    }

    const existing = await this.appleSubRepo.findOne({
      where: { originalTransactionId },
    });
    if (!existing) {
      this.logger.warn(
        `Apple ASN for unknown originalTransactionId=${originalTransactionId} ` +
          `type=${notification.notificationType}`,
      );
      return { ok: true, ignored: true };
    }

    const type = String(notification.notificationType || '').toUpperCase();
    const subtype = String(notification.subtype || '').toUpperCase();
    const expireLike =
      type === 'EXPIRED' ||
      type === 'REVOKE' ||
      type === 'REFUND' ||
      (type === 'DID_FAIL_TO_RENEW' && subtype === 'GRACE_PERIOD_EXPIRED');

    const renewLike =
      type === 'DID_RENEW' ||
      type === 'SUBSCRIBED' ||
      type === 'OFFER_REDEEMED' ||
      type === 'DID_CHANGE_RENEWAL_STATUS';

    if (expireLike) {
      const status: AppleSubscriptionStatus =
        type === 'REFUND' || type === 'REVOKE' ? 'revoked' : 'expired';
      existing.status = status;
      if (typeof tx.expiresDate === 'number') {
        existing.expiresAt = new Date(tx.expiresDate);
      }
      if (tx.transactionId) {
        existing.latestTransactionId = String(tx.transactionId);
      }
      await this.appleSubRepo.save(existing);
      await this.recomputeEffectivePlan(existing.userId);
      this.logger.log(
        `Apple ASN ${type}: marked ${originalTransactionId} as ${status}`,
      );
      return { ok: true, status };
    }

    if (renewLike || type === 'DID_CHANGE_RENEWAL_PREF') {
      try {
        const verified = this.appleIapService.toVerified(
          tx,
          data?.environment || 'Unknown',
        );
        await this.upsertAppleSubscription(existing.userId, verified, 'active');
        await this.recomputeEffectivePlan(existing.userId);
      } catch (err) {
        existing.status = 'active';
        if (typeof tx.expiresDate === 'number') {
          existing.expiresAt = new Date(tx.expiresDate);
        }
        if (tx.transactionId) {
          existing.latestTransactionId = String(tx.transactionId);
        }
        if (tx.productId) {
          existing.productId = String(tx.productId);
        }
        await this.appleSubRepo.save(existing);
        await this.recomputeEffectivePlan(existing.userId);
        this.logger.warn(
          `Apple ASN ${type}: partial update for ${originalTransactionId}: ${err}`,
        );
      }
      return { ok: true, renewed: true };
    }

    this.logger.log(
      `Apple ASN acknowledged type=${type} subtype=${subtype} tx=${originalTransactionId}`,
    );
    return { ok: true };
  }

  private normalizeRazorpayStatus(value: string): RazorpaySubscriptionStatus {
    const allowed: RazorpaySubscriptionStatus[] = [
      'created',
      'authenticated',
      'active',
      'pending',
      'halted',
      'cancelled',
      'completed',
      'expired',
    ];
    const lower = (value || '').toLowerCase() as RazorpaySubscriptionStatus;
    return allowed.includes(lower) ? lower : 'created';
  }

  private async upsertRazorpaySubscription(params: {
    userId: string;
    plan: UserPlanSlug;
    subscriptionId: string;
    customerId?: string | null;
    razorpayPlanId: string;
    status: RazorpaySubscriptionStatus;
    paymentId?: string | null;
    expiresAt?: Date | null;
  }) {
    let row = await this.razorpaySubRepo.findOne({
      where: { razorpaySubscriptionId: params.subscriptionId },
    });
    if (row && row.userId !== params.userId) {
      throw new BadRequestException(
        'This Razorpay subscription is already linked to another OpsPick account',
      );
    }
    if (!row) {
      row = this.razorpaySubRepo.create({
        id: uuidv4(),
        userId: params.userId,
        razorpaySubscriptionId: params.subscriptionId,
      });
    }
    row.userId = params.userId;
    row.planSlug = params.plan;
    row.razorpayPlanId = params.razorpayPlanId;
    row.razorpayCustomerId = params.customerId ?? row.razorpayCustomerId;
    row.status = params.status;
    if (params.paymentId) row.latestPaymentId = params.paymentId;
    if (params.expiresAt !== undefined) row.expiresAt = params.expiresAt;
    await this.razorpaySubRepo.save(row);
    return row;
  }

  private async activateRazorpaySubscriptionFromPayment(params: {
    userId: string;
    plan: UserPlanSlug;
    subscriptionId: string;
    paymentId: string;
  }): Promise<Date> {
    let expiresAt = this.paymentService.getPlanExpiryFromNow();
    let razorpayPlanId = '';
    let customerId: string | null = null;
    let status: RazorpaySubscriptionStatus = 'active';
    try {
      const remote = await this.paymentService.fetchSubscription(params.subscriptionId);
      const currentEnd = Number(remote.current_end ?? 0);
      if (currentEnd > 0) expiresAt = new Date(currentEnd * 1000);
      razorpayPlanId = String(remote.plan_id ?? '');
      customerId = remote.customer_id ? String(remote.customer_id) : null;
      status = this.normalizeRazorpayStatus(String(remote.status ?? 'active'));
    } catch (err) {
      this.logger.warn(
        `Could not fetch Razorpay subscription ${params.subscriptionId}: ${err}`,
      );
    }

    const existing = await this.razorpaySubRepo.findOne({
      where: { razorpaySubscriptionId: params.subscriptionId },
    });
    await this.upsertRazorpaySubscription({
      userId: params.userId,
      plan: params.plan,
      subscriptionId: params.subscriptionId,
      customerId,
      razorpayPlanId: razorpayPlanId || existing?.razorpayPlanId || 'unknown',
      status,
      paymentId: params.paymentId,
      expiresAt,
    });

    const previous = await this.razorpaySubRepo.find({
      where: {
        userId: params.userId,
        status: In(['created', 'authenticated', 'active', 'pending']),
      },
    });
    for (const row of previous) {
      if (row.razorpaySubscriptionId === params.subscriptionId) continue;
      row.status = 'cancelled';
      await this.razorpaySubRepo.save(row);
      await this.paymentService.cancelSubscription(row.razorpaySubscriptionId, false);
    }

    await this.activatePlan(params.userId, params.plan, {
      source: 'razorpay',
      expiresAt,
    });
    return expiresAt;
  }

  private async upsertAppleSubscription(
    userId: string,
    verified: {
      productId: string;
      plan: UserPlanSlug;
      originalTransactionId: string;
      transactionId: string;
      environment: string;
      expiresAt: Date | null;
      purchasedAt: Date | null;
    },
    status: AppleSubscriptionStatus,
  ) {
    let row = await this.appleSubRepo.findOne({
      where: { originalTransactionId: verified.originalTransactionId },
    });
    if (row && row.userId !== userId) {
      throw new BadRequestException(
        'This Apple subscription is already linked to another OpsPick account',
      );
    }
    if (!row) {
      row = this.appleSubRepo.create({
        id: uuidv4(),
        userId,
        originalTransactionId: verified.originalTransactionId,
      });
    }
    row.userId = userId;
    row.productId = verified.productId;
    row.planSlug = verified.plan;
    row.latestTransactionId = verified.transactionId;
    row.environment = verified.environment;
    row.status = status;
    row.expiresAt = verified.expiresAt;
    row.purchasedAt = verified.purchasedAt;
    await this.appleSubRepo.save(row);
  }

  /**
   * Highest active plan wins across Razorpay (user row) and Apple subscriptions.
   */
  async recomputeEffectivePlan(userId: string): Promise<{
    plan: UserPlanSlug;
    planExpiresAt: Date | null;
    source: string | null;
  }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const now = Date.now();
    const candidates: Array<{
      plan: UserPlanSlug;
      expiresAt: Date | null;
      source: string;
    }> = [];

    const appleRows = await this.appleSubRepo.find({ where: { userId } });
    for (const row of appleRows) {
      if (row.status !== 'active') continue;
      if (row.expiresAt && row.expiresAt.getTime() <= now) continue;
      const plan = normalizePlanSlug(row.planSlug);
      if (plan === 'free') continue;
      candidates.push({
        plan,
        expiresAt: row.expiresAt,
        source: 'apple',
      });
    }

    const rzRows = await this.razorpaySubRepo.find({ where: { userId } });
    for (const row of rzRows) {
      if (!['active', 'authenticated', 'pending'].includes(row.status)) continue;
      if (row.expiresAt && row.expiresAt.getTime() <= now) continue;
      const plan = normalizePlanSlug(row.planSlug);
      if (plan === 'free') continue;
      candidates.push({
        plan,
        expiresAt: row.expiresAt,
        source: 'razorpay',
      });
    }

    const razorpayPlan = normalizePlanSlug(user.currentPlan);
    const razorpayActive =
      user.planBillingSource === 'razorpay' &&
      razorpayPlan !== 'free' &&
      (!user.planExpiresAt || user.planExpiresAt.getTime() > now);

    if (razorpayActive) {
      candidates.push({
        plan: razorpayPlan,
        expiresAt: user.planExpiresAt,
        source: 'razorpay',
      });
    } else if (
      // Legacy rows (no billing source) treat stored plan as razorpay-like entitlement.
      !user.planBillingSource &&
      razorpayPlan !== 'free' &&
      (!user.planExpiresAt || user.planExpiresAt.getTime() > now) &&
      !candidates.some((c) => c.source === 'apple')
    ) {
      candidates.push({
        plan: razorpayPlan,
        expiresAt: user.planExpiresAt,
        source: 'razorpay',
      });
    }

    if (candidates.length === 0) {
      await this.userRepo.update(userId, {
        currentPlan: 'free',
        planStartedAt: new Date(),
        planExpiresAt: null,
        planBillingSource: null,
      });
      await this.unifiedBillingService.syncUserPlanToOwnedOrganizations(userId, 'free');
      return { plan: 'free', planExpiresAt: null, source: null };
    }

    candidates.sort((a, b) => {
      const rank = PLAN_ORDER.indexOf(b.plan) - PLAN_ORDER.indexOf(a.plan);
      if (rank !== 0) return rank;
      const ae = a.expiresAt?.getTime() ?? 0;
      const be = b.expiresAt?.getTime() ?? 0;
      return be - ae;
    });
    const best = candidates[0];

    await this.userRepo.update(userId, {
      currentPlan: best.plan,
      planStartedAt: new Date(),
      planExpiresAt: best.expiresAt,
      planBillingSource: best.source,
    });
    await this.unifiedBillingService.syncUserPlanToOwnedOrganizations(userId, best.plan);
    return {
      plan: best.plan,
      planExpiresAt: best.expiresAt,
      source: best.source,
    };
  }

  /** @deprecated Use createOrder + verifyPayment with Razorpay checkout */
  async upgrade(
    userId: string,
    targetPlan: UserPlanSlug,
    _paymentId?: string,
    couponCode?: string,
  ) {
    return this.createOrder(userId, targetPlan, couponCode);
  }

  async activatePlan(
    userId: string,
    plan: UserPlanSlug,
    options?: {
      expiresAt?: Date | null;
      source?: 'razorpay' | 'apple' | 'system' | null;
      allowDowngrade?: boolean;
    },
  ): Promise<UserPlanSlug> {
    const normalized = normalizePlanSlug(plan);
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const current = this.planLimitService.resolveEffectivePlan(user);
    const currentIdx = PLAN_ORDER.indexOf(current);
    const targetIdx = PLAN_ORDER.indexOf(normalized);
    const allowDowngrade = options?.allowDowngrade ?? normalized === 'free';

    if (!allowDowngrade && targetIdx < currentIdx) {
      this.logger.log(
        `Skipping activatePlan(${normalized}) for ${userId}: already on ${current}`,
      );
      return current;
    }

    const now = new Date();
    const expires =
      normalized === 'free'
        ? null
        : (options?.expiresAt ?? this.paymentService.getPlanExpiryFromNow());
    const source =
      normalized === 'free' ? null : (options?.source ?? user.planBillingSource ?? null);

    await this.userRepo.update(userId, {
      currentPlan: normalized,
      planStartedAt: now,
      planExpiresAt: expires,
      planBillingSource: source,
    });
    await this.unifiedBillingService.syncUserPlanToOwnedOrganizations(userId, normalized);
    return normalized;
  }

  async downgradeExpiredUsers(): Promise<number> {
    const users = await this.userRepo
      .createQueryBuilder('u')
      .where('u.current_plan IN (:...plans)', { plans: ['silver', 'gold'] })
      .andWhere('u.plan_expires_at IS NOT NULL')
      .andWhere('u.plan_expires_at < :now', { now: new Date() })
      .getMany();
    let count = 0;
    for (const user of users) {
      const result = await this.recomputeEffectivePlan(user.id);
      if (result.plan === 'free') {
        this.logger.log(`Downgraded expired plan for user ${user.id}`);
        count += 1;
      }
    }
    return count;
  }

  async notifyExpiringSoon(): Promise<number> {
    const now = new Date();
    const until = new Date();
    until.setDate(until.getDate() + 7);
    const users = await this.userRepo
      .createQueryBuilder('u')
      .where('u.current_plan IN (:...plans)', { plans: ['silver', 'gold'] })
      .andWhere('u.plan_expires_at IS NOT NULL')
      .andWhere('u.plan_expires_at > :now', { now })
      .andWhere('u.plan_expires_at <= :until', { until })
      .getMany();
    for (const user of users) {
      this.logger.log(
        `[Plan expiry reminder] user=${user.email} plan=${user.currentPlan} expires=${user.planExpiresAt?.toISOString()}`,
      );
    }
    return users.length;
  }
}
