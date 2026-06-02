import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  getPlanDefinition,
  normalizePlanSlug,
  type PlanDefinition,
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
    @InjectRepository(OrganizationInvitationEntity)
    private readonly invitationsRepo: Repository<OrganizationInvitationEntity>,
  ) {}

  private async findUser(userId: string): Promise<UserEntity | null> {
    return this.userRepo.findOne({ where: { id: userId } });
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
    const limits = getPlanDefinition(plan).limits;

    const ownedWorkspaces = await this.organizationsRepository.findByOwnerId(userId);
    const workspaceUsed = ownedWorkspaces.length;

    let memberUsed = 0;
    if (organizationId) {
      memberUsed = await this.countWorkspaceSeats(organizationId);
    } else if (ownedWorkspaces.length > 0) {
      memberUsed = await this.countWorkspaceSeats(ownedWorkspaces[0].id);
    }

    const storageUsed = Number(user?.storageUsed ?? 0);

    return {
      workspaces: { used: workspaceUsed, limit: limits.maxWorkspaces },
      members: { used: memberUsed, limit: limits.maxMembersPerWorkspace },
      storage: { usedBytes: storageUsed, limitBytes: limits.storageBytes },
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
    const limit = getPlanDefinition(plan).limits.maxWorkspaces;
    if (limit === null) return true;
    const used = (await this.organizationsRepository.findByOwnerId(userId)).length;
    return used < limit;
  }

  async checkMemberLimit(organizationId: string): Promise<boolean> {
    const ownerId = await this.getOwnerIdForWorkspace(organizationId);
    if (!ownerId) return true;
    const user = await this.findUser(ownerId);
    const plan = user ? this.resolveEffectivePlan(user) : 'free';
    const limit = getPlanDefinition(plan).limits.maxMembersPerWorkspace;
    if (limit === null) return true;
    const used = await this.countWorkspaceSeats(organizationId);
    return used < limit;
  }

  async checkStorageLimit(userId: string, fileSize: number): Promise<boolean> {
    const user = await this.findUser(userId);
    const plan = user ? this.resolveEffectivePlan(user) : 'free';
    const limitBytes = getPlanDefinition(plan).limits.storageBytes;
    const used = Number(user?.storageUsed ?? 0);
    return used + fileSize <= limitBytes;
  }

  async assertWorkspaceLimit(userId: string): Promise<void> {
    const user = await this.findUser(userId);
    const plan = user ? this.resolveEffectivePlan(user) : 'free';
    const limit = getPlanDefinition(plan).limits.maxWorkspaces;
    const used = (await this.organizationsRepository.findByOwnerId(userId)).length;
    if (limit !== null && used >= limit) {
      this.throwLimit('workspace', plan, used, limit);
    }
  }

  async assertMemberLimit(organizationId: string): Promise<void> {
    const ownerId = await this.getOwnerIdForWorkspace(organizationId);
    if (!ownerId) return;
    const user = await this.findUser(ownerId);
    const plan = user ? this.resolveEffectivePlan(user) : 'free';
    const limit = getPlanDefinition(plan).limits.maxMembersPerWorkspace;
    const used = await this.countWorkspaceSeats(organizationId);
    if (limit !== null && used >= limit) {
      this.throwLimit('member', plan, used, limit);
    }
  }

  async assertStorageLimit(userId: string, fileSize: number): Promise<void> {
    const user = await this.findUser(userId);
    const plan = user ? this.resolveEffectivePlan(user) : 'free';
    const limitBytes = getPlanDefinition(plan).limits.storageBytes;
    const used = Number(user?.storageUsed ?? 0);
    if (used + fileSize > limitBytes) {
      this.throwLimit('storage', plan, used, limitBytes);
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

  private throwLimit(
    limitType: PlanLimitType,
    plan: UserPlanSlug,
    currentUsage: number,
    planLimit: number,
  ): never {
    throw new LimitExceededException(
      buildLimitExceededPayload(limitType, plan, currentUsage, planLimit),
    );
  }
}
