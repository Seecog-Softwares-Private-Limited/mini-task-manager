import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PLANS,
  PLAN_ORDER,
  buildPlanBenefitsFromLimits,
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
import { UnifiedBillingService } from '../modules/billing/unified-billing.service';

@Injectable()
export class PlansService {
  private readonly logger = new Logger(PlansService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly planLimitService: PlanLimitService,
    private readonly planConfigurationsService: PlanConfigurationsService,
    private readonly paymentService: PaymentService,
    private readonly couponCodesService: CouponCodesService,
    private readonly unifiedBillingService: UnifiedBillingService,
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
      };
      const resolvedLimits = {
        maxWorkspaces: limits.maxWorkspaces,
        maxMembersPerWorkspace: limits.maxUsers,
        storageBytes: limits.maxStorage,
      };
      return {
        slug: def.slug,
        name: def.name,
        price: def.pricing.priceMonthlyInr,
        currency: def.pricing.currency,
        priceLabel: def.pricing.label,
        limits: resolvedLimits,
        benefits: buildPlanBenefitsFromLimits({
          maxWorkspaces: resolvedLimits.maxWorkspaces,
          maxMembersPerWorkspace: resolvedLimits.maxMembersPerWorkspace,
          storageBytes: resolvedLimits.storageBytes,
        }),
        allowCoupon: limits.allowCoupon ?? false,
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
    const originalAmount = def.pricing.priceMonthlyInr;
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
      await this.activatePlan(userId, targetPlan);
      return {
        requiresPayment: false,
        plan: targetPlan,
        planExpiresAt: this.paymentService.getPlanExpiryFromNow().toISOString(),
        message: 'Plan activated (100% discount)',
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
        planName,
      },
      originalAmountInr: originalAmount,
      finalAmountInr: amount,
      couponApplied: !!normalizedCoupon,
    };
  }

  /** Verify Razorpay payment and activate user plan. */
  async verifyPayment(userId: string, dto: VerifyUserPlanPaymentDto) {
    await this.assertCanUpgrade(userId, dto.plan);
    const { originalAmount, amount, normalizedCoupon } = await this.resolveUpgradePricing(
      userId,
      dto.plan,
      dto.couponCode,
    );

    const valid = this.paymentService.verifyUserPlanPayment({
      orderId: dto.razorpay_order_id,
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

    await this.activatePlan(userId, dto.plan);
    this.logger.log(
      `User ${userId} upgraded to ${dto.plan} (order=${dto.razorpay_order_id})`,
    );
    return {
      requiresPayment: false,
      plan: dto.plan,
      planExpiresAt: this.paymentService.getPlanExpiryFromNow().toISOString(),
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

  async activatePlan(userId: string, plan: UserPlanSlug): Promise<void> {
    const now = new Date();
    const expires =
      plan === 'free' ? null : this.paymentService.getPlanExpiryFromNow();
    await this.userRepo.update(userId, {
      currentPlan: normalizePlanSlug(plan),
      planStartedAt: now,
      planExpiresAt: expires,
    });
    await this.unifiedBillingService.syncUserPlanToOwnedOrganizations(userId, plan);
  }

  async downgradeExpiredUsers(): Promise<number> {
    const users = await this.userRepo
      .createQueryBuilder('u')
      .where('u.current_plan IN (:...plans)', { plans: ['silver', 'gold'] })
      .andWhere('u.plan_expires_at IS NOT NULL')
      .andWhere('u.plan_expires_at < :now', { now: new Date() })
      .getMany();
    for (const user of users) {
      await this.activatePlan(user.id, 'free');
      this.logger.log(`Downgraded expired plan for user ${user.id}`);
    }
    return users.length;
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
