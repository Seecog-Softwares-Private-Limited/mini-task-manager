import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  getPlanDefinition,
  normalizePlanSlug,
  type PlanDefinition,
  type PlanLimits,
  type UserPlanSlug,
} from '../config/plans.config';
import { UserEntity } from '../modules/users/entities/user.entity';
import { OrganizationInvitationEntity } from '../modules/invitations/entities/organization-invitation.entity';
import { OrganizationsRepository } from '../modules/organizations/repositories/organizations.repository';
import { OrganizationMembersRepository } from '../modules/organizations/repositories/organization-members.repository';
import {
  buildLimitExceededPayload,
  LimitExceededException,
  type PlanLimitType,
} from './limit-exceeded.exception';
import { PlanConfigurationsService } from './plan-configurations.service';
import { UsageService } from '../modules/billing/usage.service';

export interface PlanUsageStats {
  workspaces: { used: number; limit: number | null };
  members: { used: number; limit: number | null };
  storage: { usedBytes: number; limitBytes: number };
}

export interface CurrentPlanDetails {
  plan: UserPlanSlug;
  definition: PlanDefinition;
  planStartedAt: string | null;
  planExpiresAt: string | null;
  usage: PlanUsageStats;
}

@Injectable()
export class PlanLimitService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly organizationsRepository: OrganizationsRepository,
    private readonly orgMembersRepository: OrganizationMembersRepository,
    private readonly planConfigurationsService: PlanConfigurationsService,
    @Inject(forwardRef(() => UsageService))
    private readonly usageService: UsageService,
    @InjectRepository(OrganizationInvitationEntity)
    private readonly invitationsRepo: Repository<OrganizationInvitationEntity>,
  ) {}

  private async findUser(userId: string): Promise<UserEntity | null> {
    return this.userRepo.findOne({ where: { id: userId } });
  }

  private async getLimits(plan: UserPlanSlug): Promise<PlanLimits> {
    return this.planConfigurationsService.getPlanLimits(plan);
  }

  async getCurrentPlan(userId: string): Promise<CurrentPlanDetails> {
    const user = await this.findUser(userId);
    if (!user) {
      const def = getPlanDefinition('free');
      return {
        plan: 'free',
        definition: def,
        planStartedAt: null,
        planExpiresAt: null,
        usage: await this.getUsageStats(userId),
      };
    }
    const plan = this.resolveEffectivePlan(user);
    const usage = await this.getUsageStats(userId);
    return {
      plan,
      definition: getPlanDefinition(plan),
      planStartedAt: user.planStartedAt?.toISOString() ?? null,
      planExpiresAt: user.planExpiresAt?.toISOString() ?? null,
      usage,
    };
  }

  resolveEffectivePlan(user: UserEntity): UserPlanSlug {
    const slug = normalizePlanSlug(user.currentPlan);
    if (slug !== 'free' && user.planExpiresAt && user.planExpiresAt.getTime() < Date.now()) {
      return 'free';
    }
    return slug;
  }

  async getUsageStats(userId: string, organizationId?: string): Promise<PlanUsageStats> {
    const user = await this.findUser(userId);
    const plan = user ? this.resolveEffectivePlan(user) : 'free';
    const limits = await this.getLimits(plan);

    const ownedWorkspaces = await this.organizationsRepository.findByOwnerId(userId);
    const workspaceUsed = ownedWorkspaces.length;

    let memberUsed = 0;
    let storageUsed = Number(user?.storageUsed ?? 0);
    let memberLimit = limits.maxMembersPerWorkspace;
    let storageLimit = limits.storageBytes;

    if (organizationId) {
      const orgUsage = await this.usageService.getOrganizationUsage(organizationId);
      memberUsed = orgUsage.users.current;
      memberLimit = orgUsage.users.limit;
      storageUsed = Math.round(orgUsage.storageGb.current * 1024 * 1024 * 1024);
      storageLimit =
        orgUsage.storageGb.limit === null
          ? limits.storageBytes
          : Math.round(orgUsage.storageGb.limit * 1024 * 1024 * 1024);
    } else if (ownedWorkspaces.length > 0) {
      memberUsed = await this.countWorkspaceSeats(ownedWorkspaces[0].id);
    }

    return {
      workspaces: { used: workspaceUsed, limit: limits.maxWorkspaces },
      members: { used: memberUsed, limit: memberLimit },
      storage: { usedBytes: storageUsed, limitBytes: storageLimit },
    };
  }

  private async countWorkspaceSeats(organizationId: string): Promise<number> {
    const active = await this.orgMembersRepository.countByOrganization(organizationId);
    const pending = await this.invitationsRepo.count({
      where: { organizationId, status: 'PENDING' },
    });
    return active + pending;
  }

  private async getOwnerIdForWorkspace(organizationId: string): Promise<string | null> {
    const org = await this.organizationsRepository.findById(organizationId);
    return org?.ownerId ?? null;
  }

  async checkWorkspaceLimit(userId: string): Promise<boolean> {
    const user = await this.findUser(userId);
    const plan = user ? this.resolveEffectivePlan(user) : 'free';
    const limit = (await this.getLimits(plan)).maxWorkspaces;
    if (limit === null) return true;
    const used = (await this.organizationsRepository.findByOwnerId(userId)).length;
    return used < limit;
  }

  async checkMemberLimit(organizationId: string): Promise<boolean> {
    const usage = await this.usageService.getOrganizationUsage(organizationId);
    if (usage.users.limit === null) return true;
    return usage.users.current < usage.users.limit;
  }

  async checkStorageLimit(userId: string, fileSize: number): Promise<boolean> {
    const user = await this.findUser(userId);
    const plan = user ? this.resolveEffectivePlan(user) : 'free';
    const limitBytes = (await this.getLimits(plan)).storageBytes;
    const used = Number(user?.storageUsed ?? 0);
    return used + fileSize <= limitBytes;
  }

  async assertWorkspaceLimit(userId: string): Promise<void> {
    const user = await this.findUser(userId);
    const plan = user ? this.resolveEffectivePlan(user) : 'free';
    const limit = (await this.getLimits(plan)).maxWorkspaces;
    const used = (await this.organizationsRepository.findByOwnerId(userId)).length;
    if (limit !== null && used >= limit) {
      await this.throwLimit('workspace', plan, used, limit);
    }
  }

  async assertMemberLimit(organizationId: string): Promise<void> {
    const check = await this.usageService.checkLimit(organizationId, 'users', 1);
    if (!check.allowed) {
      const ownerId = await this.getOwnerIdForWorkspace(organizationId);
      const user = ownerId ? await this.findUser(ownerId) : null;
      const plan = user ? this.resolveEffectivePlan(user) : 'free';
      const usage = await this.usageService.getOrganizationUsage(organizationId);
      await this.throwLimit('member', plan, usage.users.current, usage.users.limit ?? 0);
    }
  }

  async assertStorageLimit(userId: string, fileSize: number): Promise<void> {
    const user = await this.findUser(userId);
    const plan = user ? this.resolveEffectivePlan(user) : 'free';
    const limitBytes = (await this.getLimits(plan)).storageBytes;
    const used = Number(user?.storageUsed ?? 0);
    if (used + fileSize > limitBytes) {
      await this.throwLimit('storage', plan, used, limitBytes);
    }
  }

  async incrementStorageUsed(userId: string, bytes: number): Promise<void> {
    if (bytes <= 0) return;
    await this.userRepo.increment({ id: userId }, 'storageUsed', bytes);
  }

  async decrementStorageUsed(userId: string, bytes: number): Promise<void> {
    if (bytes <= 0) return;
    await this.userRepo
      .createQueryBuilder()
      .update(UserEntity)
      .set({
        storageUsed: () => `GREATEST(0, CAST(storage_used AS SIGNED) - ${Math.floor(bytes)})`,
      })
      .where('id = :id', { id: userId })
      .execute();
  }

  private async throwLimit(
    limitType: PlanLimitType,
    plan: UserPlanSlug,
    currentUsage: number,
    planLimit: number,
  ): Promise<never> {
    const configs = await this.planConfigurationsService.getAll();
    const priceByPlan = Object.fromEntries(
      configs.map((config) => [config.planName, config.priceMonthlyInr]),
    ) as Partial<Record<UserPlanSlug, number>>;
    throw new LimitExceededException(
      buildLimitExceededPayload(
        limitType,
        plan,
        currentUsage,
        planLimit,
        priceByPlan,
      ),
    );
  }
}
