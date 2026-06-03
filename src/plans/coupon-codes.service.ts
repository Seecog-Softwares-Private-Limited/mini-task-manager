import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { generateUuid } from '../common/utils/uuid.util';
import {
  getPlanDefinition,
  PLANS,
  type UserPlanSlug,
} from '../config/plans.config';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { CouponCodeEntity } from './entities/coupon-code.entity';
import { CouponCodesRepository } from './repositories/coupon-codes.repository';
import { PlanConfigurationsService } from './plan-configurations.service';

export interface CouponCodeView {
  id: string;
  code: string;
  discountPercent: number;
  applicablePlans: UserPlanSlug[];
  isActive: boolean;
  maxRedemptions: number | null;
  redemptionCount: number;
  expiresAt: string | null;
  createdAt: string;
}

export interface CouponValidationResult {
  valid: boolean;
  code: string;
  plan: UserPlanSlug;
  discountPercent: number;
  originalAmountInr: number;
  finalAmountInr: number;
  savingsInr: number;
  message?: string;
}

@Injectable()
export class CouponCodesService {
  constructor(
    private readonly couponRepository: CouponCodesRepository,
    private readonly planConfigurationsService: PlanConfigurationsService,
  ) {}

  private toView(entity: CouponCodeEntity): CouponCodeView {
    return {
      id: entity.id,
      code: entity.code,
      discountPercent: entity.discountPercent,
      applicablePlans: entity.applicablePlans,
      isActive: entity.isActive,
      maxRedemptions: entity.maxRedemptions,
      redemptionCount: entity.redemptionCount,
      expiresAt: entity.expiresAt?.toISOString() ?? null,
      createdAt: entity.createdAt.toISOString(),
    };
  }

  static computeDiscountedAmount(baseInr: number, discountPercent: number): number {
    const savings = Math.round((baseInr * discountPercent) / 100);
    return Math.max(0, baseInr - savings);
  }

  private generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let suffix = '';
    for (let i = 0; i < 8; i++) {
      suffix += chars[Math.floor(Math.random() * chars.length)];
    }
    return `SAVE${suffix}`;
  }

  async listAll(): Promise<CouponCodeView[]> {
    try {
      const rows = await this.couponRepository.findAll();
      return rows.map((r) => this.toView(r));
    } catch (error) {
      if (this.isMissingTable(error)) return [];
      throw error;
    }
  }

  async create(dto: CreateCouponDto, createdBy?: string): Promise<CouponCodeView> {
    const applicablePlans = [...new Set(dto.applicablePlans)] as UserPlanSlug[];
    if (!applicablePlans.every((p) => p === 'silver' || p === 'gold')) {
      throw new BadRequestException('Coupons can only apply to Silver or Gold plans');
    }

    let code = (dto.code ?? this.generateCode()).trim().toUpperCase().replace(/\s+/g, '-');
    if (code.length < 4) throw new BadRequestException('Coupon code must be at least 4 characters');

    const existing = await this.couponRepository.findByCode(code);
    if (existing) throw new BadRequestException('Coupon code already exists');

    const entity = new CouponCodeEntity();
    entity.id = generateUuid();
    entity.code = code;
    entity.discountPercent = dto.discountPercent;
    entity.applicablePlans = applicablePlans;
    entity.isActive = true;
    entity.maxRedemptions = dto.maxRedemptions ?? null;
    entity.redemptionCount = 0;
    entity.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    entity.createdBy = createdBy ?? null;

    const saved = await this.couponRepository.save(entity);
    return this.toView(saved);
  }

  async setActive(id: string, isActive: boolean): Promise<CouponCodeView> {
    const row = await this.couponRepository.findById(id);
    if (!row) throw new NotFoundException('Coupon not found');
    row.isActive = isActive;
    const saved = await this.couponRepository.save(row);
    return this.toView(saved);
  }

  async delete(id: string): Promise<{ success: boolean }> {
    const row = await this.couponRepository.findById(id);
    if (!row) throw new NotFoundException('Coupon not found');
    row.isActive = false;
    await this.couponRepository.save(row);
    return { success: true };
  }

  async validateForPlan(
    code: string,
    plan: UserPlanSlug,
    userId?: string,
  ): Promise<CouponValidationResult> {
    const baseInr = getPlanDefinition(plan).pricing.priceMonthlyInr;
    const invalid = (message: string): CouponValidationResult => ({
      valid: false,
      code: code.trim().toUpperCase(),
      plan,
      discountPercent: 0,
      originalAmountInr: baseInr,
      finalAmountInr: baseInr,
      savingsInr: 0,
      message,
    });

    if (plan === 'free') {
      return invalid('Coupons cannot be applied to the Free plan');
    }

    const config = await this.planConfigurationsService.getByPlanName(plan);
    if (!config.allowCoupon) {
      return invalid(`Coupon codes are not enabled for the ${PLANS[plan].name} plan`);
    }

    let coupon: CouponCodeEntity | null;
    try {
      coupon = await this.couponRepository.findByCode(code);
    } catch (error) {
      if (this.isMissingTable(error)) {
        return invalid('Coupon system is not available yet');
      }
      throw error;
    }

    if (!coupon || !coupon.isActive) {
      return invalid('Invalid or inactive coupon code');
    }

    if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) {
      return invalid('This coupon has expired');
    }

    if (
      coupon.maxRedemptions !== null &&
      coupon.redemptionCount >= coupon.maxRedemptions
    ) {
      return invalid('This coupon has reached its usage limit');
    }

    if (!coupon.applicablePlans.includes(plan)) {
      return invalid(`This coupon does not apply to the ${PLANS[plan].name} plan`);
    }

    if (userId) {
      const already = await this.couponRepository.hasUserRedeemed(coupon.id, userId);
      if (already) {
        return invalid('You have already used this coupon');
      }
    }

    const finalAmountInr = CouponCodesService.computeDiscountedAmount(
      baseInr,
      coupon.discountPercent,
    );

    return {
      valid: true,
      code: coupon.code,
      plan,
      discountPercent: coupon.discountPercent,
      originalAmountInr: baseInr,
      finalAmountInr,
      savingsInr: baseInr - finalAmountInr,
    };
  }

  async redeem(
    code: string,
    plan: UserPlanSlug,
    userId: string,
    originalAmountInr: number,
    finalAmountInr: number,
  ): Promise<void> {
    const check = await this.validateForPlan(code, plan, userId);
    if (!check.valid) {
      throw new BadRequestException(check.message ?? 'Invalid coupon');
    }

    const coupon = await this.couponRepository.findByCode(code);
    if (!coupon) throw new BadRequestException('Coupon not found');

    await this.couponRepository.saveRedemption({
      id: generateUuid(),
      couponId: coupon.id,
      userId,
      planName: plan,
      discountPercent: coupon.discountPercent,
      originalAmountInr: String(originalAmountInr),
      finalAmountInr: String(finalAmountInr),
    });
    await this.couponRepository.incrementRedemption(coupon.id);
  }

  private isMissingTable(error: unknown): boolean {
    return (
      error instanceof QueryFailedError &&
      typeof (error as { message?: unknown }).message === 'string' &&
      ((error as { message: string }).message.includes('coupon_codes') ||
        (error as { message: string }).message.includes('coupon_redemptions'))
    );
  }
}
