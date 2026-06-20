import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import {
  PLAN_ORDER,
  PLANS,
  type PlanLimits,
  type UserPlanSlug,
} from '../config/plans.config';
import { UpdatePlanConfigurationDto } from './dto/update-plan-configuration.dto';
import { PlanConfigurationsRepository } from './repositories/plan-configurations.repository';

export interface PlanConfigurationView {
  planName: UserPlanSlug;
  maxUsers: number | null;
  maxStorage: number;
  maxWorkspaces: number | null;
  allowCoupon: boolean;
  priceMonthlyInr: number;
}

type CacheEntry = {
  expiresAt: number;
  values: Record<UserPlanSlug, PlanConfigurationView>;
};

@Injectable()
export class PlanConfigurationsService {
  private cache: CacheEntry | null = null;
  private readonly cacheTtlMs = 60_000;

  constructor(
    private readonly planConfigurationsRepository: PlanConfigurationsRepository,
  ) {}

  private static defaultAllowCoupon(slug: UserPlanSlug): boolean {
    return slug === 'silver' || slug === 'gold';
  }

  private static fromDefault(slug: UserPlanSlug): PlanConfigurationView {
    const limits = PLANS[slug].limits;
    return {
      planName: slug,
      maxUsers: limits.maxMembersPerWorkspace,
      maxStorage: limits.storageBytes,
      maxWorkspaces: limits.maxWorkspaces,
      allowCoupon: PlanConfigurationsService.defaultAllowCoupon(slug),
      priceMonthlyInr: PLANS[slug].pricing.priceMonthlyInr,
    };
  }

  private mergeWithDefaults(
    rows: Awaited<ReturnType<PlanConfigurationsRepository['findAll']>>,
  ): Record<UserPlanSlug, PlanConfigurationView> {
    const merged = PLAN_ORDER.reduce(
      (acc, slug) => {
        acc[slug] = PlanConfigurationsService.fromDefault(slug);
        return acc;
      },
      {} as Record<UserPlanSlug, PlanConfigurationView>,
    );

    for (const row of rows) {
      const key = row.planName as UserPlanSlug;
      if (!PLAN_ORDER.includes(key)) continue;
      merged[key] = {
        planName: key,
        maxUsers: row.maxUsers,
        maxStorage: Number(row.maxStorage),
        maxWorkspaces: row.maxWorkspaces,
        allowCoupon:
          row.allowCoupon ?? PlanConfigurationsService.defaultAllowCoupon(key),
        priceMonthlyInr:
          row.priceMonthlyInr ?? PLANS[key].pricing.priceMonthlyInr,
      };
    }

    return merged;
  }

  private async getConfigMap(): Promise<Record<UserPlanSlug, PlanConfigurationView>> {
    if (this.cache && this.cache.expiresAt > Date.now()) {
      return this.cache.values;
    }
    let merged: Record<UserPlanSlug, PlanConfigurationView>;
    try {
      const rows = await this.planConfigurationsRepository.findAll();
      merged = this.mergeWithDefaults(rows);
    } catch (error) {
      // Backward compatibility for environments where migration has not run yet.
      const msg =
        error instanceof QueryFailedError &&
        typeof (error as { message?: unknown }).message === 'string'
          ? (error as { message: string }).message
          : '';
      if (
        msg.includes('plan_configurations') ||
        msg.includes('allow_coupon') ||
        msg.includes('price_monthly_inr')
      ) {
        merged = this.mergeWithDefaults([]);
      } else {
        throw error;
      }
    }
    this.cache = {
      expiresAt: Date.now() + this.cacheTtlMs,
      values: merged,
    };
    return merged;
  }

  private invalidateCache() {
    this.cache = null;
  }

  async getAll(): Promise<PlanConfigurationView[]> {
    const map = await this.getConfigMap();
    return PLAN_ORDER.map((slug) => map[slug]);
  }

  async getByPlanName(planName: UserPlanSlug): Promise<PlanConfigurationView> {
    const map = await this.getConfigMap();
    const config = map[planName];
    if (!config) throw new NotFoundException(`Configuration not found for plan "${planName}"`);
    return config;
  }

  async getPlanLimits(planName: UserPlanSlug): Promise<PlanLimits> {
    const config = await this.getByPlanName(planName);
    return {
      maxMembersPerWorkspace: config.maxUsers,
      maxWorkspaces: config.maxWorkspaces,
      storageBytes: config.maxStorage,
    };
  }

  async updatePlan(
    planName: UserPlanSlug,
    dto: UpdatePlanConfigurationDto,
  ): Promise<PlanConfigurationView> {
    const current = await this.getByPlanName(planName);

    const nextMaxMembers =
      dto.maxUsers === undefined
        ? current.maxUsers
        : dto.maxUsers;
    const nextStorage =
      dto.maxStorage === undefined ? current.maxStorage : dto.maxStorage;
    const nextWorkspaces =
      dto.maxWorkspaces === undefined ? current.maxWorkspaces : dto.maxWorkspaces;
    const nextAllowCoupon =
      dto.allowCoupon === undefined ? current.allowCoupon : dto.allowCoupon;
    const nextPriceMonthlyInr =
      dto.priceMonthlyInr === undefined
        ? current.priceMonthlyInr
        : dto.priceMonthlyInr;

    if (planName === 'free' && nextAllowCoupon) {
      throw new BadRequestException('Coupon codes cannot be enabled on the Free plan');
    }

    if (planName === 'free' && nextPriceMonthlyInr !== 0) {
      throw new BadRequestException('Free plan price must be 0');
    }

    if (nextPriceMonthlyInr < 0) {
      throw new BadRequestException('priceMonthlyInr must be zero or positive');
    }

    if (nextStorage <= 0) {
      throw new BadRequestException('maxStorage must be a positive number');
    }
    if (nextMaxMembers !== null && nextMaxMembers <= 0) {
      throw new BadRequestException('maxUsers must be positive or null');
    }
    if (nextWorkspaces !== null && nextWorkspaces <= 0) {
      throw new BadRequestException('maxWorkspaces must be positive or null');
    }

    const saved = await this.planConfigurationsRepository.upsert(planName, {
      maxUsers: nextMaxMembers,
      maxStorage: String(nextStorage),
      maxWorkspaces: nextWorkspaces,
      allowCoupon: nextAllowCoupon,
      priceMonthlyInr: nextPriceMonthlyInr,
    });
    this.invalidateCache();

    return {
      planName: saved.planName as UserPlanSlug,
      maxUsers: saved.maxUsers,
      maxStorage: Number(saved.maxStorage),
      maxWorkspaces: saved.maxWorkspaces,
      allowCoupon: saved.allowCoupon ?? PlanConfigurationsService.defaultAllowCoupon(planName),
      priceMonthlyInr:
        saved.priceMonthlyInr ?? PLANS[planName].pricing.priceMonthlyInr,
    };
  }
}

