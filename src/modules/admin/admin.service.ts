import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { uuidBinaryTransformer } from '../../common/base.entity';
import { OrganizationsRepository } from '../organizations/repositories/organizations.repository';
import {
  IOrganizationMembersRepository,
  ORGANIZATION_MEMBERS_REPOSITORY,
} from '../organizations/repositories/organization-members.repository.interface';
import { BillingService } from '../billing/billing.service';
import { UsersService } from '../users/users.service';
import type {
  AdminOrganizationDetailDto,
  AdminOrganizationListItemDto,
} from './dto/admin-organization.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly organizationsRepository: OrganizationsRepository,
    @Inject(ORGANIZATION_MEMBERS_REPOSITORY)
    private readonly orgMembersRepo: IOrganizationMembersRepository,
    private readonly billingService: BillingService,
    private readonly usersService: UsersService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async listOrganizations(params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
  }): Promise<{ data: AdminOrganizationListItemDto[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    const { items, total } = await this.organizationsRepository.findAllPaginated(params);
    const data: AdminOrganizationListItemDto[] = [];

    for (const org of items) {
      data.push(await this.toListItem(org));
    }

    const totalPages = Math.max(1, Math.ceil(total / params.limit));
    return {
      data,
      meta: { total, page: params.page, limit: params.limit, totalPages },
    };
  }

  async getOrganization(id: string): Promise<AdminOrganizationDetailDto> {
    const org = await this.organizationsRepository.findById(id);
    if (!org || org.status === 'DELETED') {
      throw new NotFoundException('Organization not found');
    }

    const base = await this.toListItem(org);
    const usage = await this.billingService.getUsage(id);
    const sub = await this.billingService.getSubscriptionForOrganization(id);

    return {
      ...base,
      suspensionReason: org.suspensionReason,
      planId: sub?.planId ?? null,
      usage: {
        users: usage.users,
        projects: usage.projects,
        storageGb: usage.storageGb,
      },
    };
  }

  async setOrganizationPlan(
    organizationId: string,
    planId: string,
    billingCycle?: 'monthly' | 'yearly',
  ) {
    const org = await this.organizationsRepository.findById(organizationId);
    if (!org || org.status === 'DELETED') {
      throw new NotFoundException('Organization not found');
    }
    await this.billingService.adminSetOrganizationPlan(organizationId, planId, { billingCycle });
    return this.getOrganization(organizationId);
  }

  async suspendOrganization(organizationId: string, reason?: string) {
    const org = await this.organizationsRepository.findById(organizationId);
    if (!org || org.status === 'DELETED') {
      throw new NotFoundException('Organization not found');
    }
    await this.organizationsRepository.update(organizationId, {
      status: 'SUSPENDED',
      suspendedAt: new Date(),
      suspensionReason: reason?.trim() || null,
    });
    return this.getOrganization(organizationId);
  }

  async unsuspendOrganization(organizationId: string) {
    const org = await this.organizationsRepository.findById(organizationId);
    if (!org || org.status === 'DELETED') {
      throw new NotFoundException('Organization not found');
    }
    await this.organizationsRepository.update(organizationId, {
      status: 'ACTIVE',
      suspendedAt: null,
      suspensionReason: null,
    });
    return this.getOrganization(organizationId);
  }

  /** Permanently delete tenant and all related data (cascade). Orphaned user accounts are removed. */
  async deleteOrganizationPermanently(
    organizationId: string,
  ): Promise<{ success: true; deletedOrganizationId: string; deletedUserIds: string[] }> {
    const org = await this.organizationsRepository.findById(organizationId);
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const members = await this.orgMembersRepo.findByOrganization(organizationId);
    const candidateUserIds = [
      ...new Set([org.ownerId, ...members.map((m) => m.userId)]),
    ];

    const orgBin = uuidBinaryTransformer.to(organizationId) as Buffer;
    const deletedUserIds: string[] = [];

    await this.dataSource.transaction(async (manager) => {
      // Clear RESTRICT FKs on tasks so project/org cascade can succeed.
      await manager.query(
        `UPDATE tasks SET parent_task_id = NULL, sprint_id = NULL, status_id = NULL WHERE organization_id = ?`,
        [orgBin],
      );
      try {
        await manager.query(`DELETE FROM organization_usage WHERE organization_id = ?`, [orgBin]);
      } catch {
        /* optional table — may not exist on older DBs */
      }
      await manager.query(`DELETE FROM organizations WHERE id = ?`, [orgBin]);

      for (const userId of candidateUserIds) {
        const deleted = await this.tryDeleteOrphanedUser(manager, userId);
        if (deleted) deletedUserIds.push(userId);
      }
    });

    return { success: true, deletedOrganizationId: organizationId, deletedUserIds };
  }

  /** Remove user when they no longer belong to any organization. Skips platform admins. */
  private async tryDeleteOrphanedUser(
    manager: { query: (sql: string, params?: unknown[]) => Promise<unknown> },
    userId: string,
  ): Promise<boolean> {
    const userBin = uuidBinaryTransformer.to(userId) as Buffer;

    const userRows = (await manager.query(
      `SELECT is_platform_admin FROM users WHERE id = ? LIMIT 1`,
      [userBin],
    )) as Array<{ is_platform_admin: number | boolean }>;
    if (!userRows[0] || Boolean(userRows[0].is_platform_admin)) {
      return false;
    }

    const memberRows = (await manager.query(
      `SELECT COUNT(*) as cnt FROM organization_members WHERE user_id = ?`,
      [userBin],
    )) as Array<{ cnt: string | number }>;
    if (Number(memberRows[0]?.cnt ?? 0) > 0) {
      return false;
    }

    const ownerRows = (await manager.query(
      `SELECT COUNT(*) as cnt FROM organizations WHERE owner_id = ?`,
      [userBin],
    )) as Array<{ cnt: string | number }>;
    if (Number(ownerRows[0]?.cnt ?? 0) > 0) {
      return false;
    }

    try {
      await manager.query(`UPDATE tasks SET assignee_id = NULL WHERE assignee_id = ?`, [userBin]);
      await manager.query(`UPDATE tasks SET reporter_id = NULL WHERE reporter_id = ?`, [userBin]);
    } catch {
      /* tasks may already be gone with the org */
    }

    await manager.query(`DELETE FROM users WHERE id = ?`, [userBin]);
    return true;
  }

  /** Delete all workspaces owned by a user, then remove the user account. */
  async deleteUserCompletely(userId: string): Promise<{
    success: true;
    deletedUserId: string;
    deletedOrganizationIds: string[];
  }> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    if (user.isPlatformAdmin) {
      throw new ForbiddenException('Cannot delete a platform administrator');
    }

    const ownedOrgs = await this.organizationsRepository.findByOwnerId(userId);
    const deletedOrganizationIds: string[] = [];
    for (const org of ownedOrgs) {
      const result = await this.deleteOrganizationPermanently(org.id);
      deletedOrganizationIds.push(result.deletedOrganizationId);
    }

    const userBin = uuidBinaryTransformer.to(userId) as Buffer;
    await this.dataSource.transaction(async (manager) => {
      await manager.query(`DELETE FROM organization_members WHERE user_id = ?`, [userBin]);
      await this.tryDeleteOrphanedUser(manager, userId);
    });

    const stillExists = await this.usersService.findById(userId);
    if (stillExists) {
      throw new ForbiddenException(
        'User could not be fully removed. Delete any remaining organizations they belong to first.',
      );
    }

    return { success: true, deletedUserId: userId, deletedOrganizationIds };
  }

  async deleteUserCompletelyByEmail(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new NotFoundException('User not found');
    return this.deleteUserCompletely(user.id);
  }

  async setUserActive(userId: string, active: boolean) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    await this.usersService.setActive(userId, active);
    return this.usersService.findById(userId);
  }

  private async toListItem(org: {
    id: string;
    name: string;
    slug: string;
    status: string;
    createdAt: Date;
    suspendedAt: Date | null;
    owner?: { email: string; fullName: string } | null;
    ownerId: string;
  }): Promise<AdminOrganizationListItemDto> {
    const [members, sub] = await Promise.all([
      this.orgMembersRepo.findByOrganization(org.id),
      this.billingService.getSubscriptionForOrganization(org.id),
    ]);

    let ownerEmail = org.owner?.email ?? '';
    let ownerName = org.owner?.fullName ?? '';
    if (!ownerEmail) {
      const owner = await this.usersService.findById(org.ownerId);
      ownerEmail = owner?.email ?? '';
      ownerName = owner?.fullName ?? '';
    }

    const plan = sub?.planId ? await this.billingService.getPlanById(sub.planId) : null;

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      status: org.status,
      ownerEmail,
      ownerName,
      memberCount: members.length,
      planName: plan?.name ?? null,
      planSlug: plan?.slug ?? null,
      subscriptionStatus: sub?.status ?? null,
      createdAt: org.createdAt,
      suspendedAt: org.suspendedAt,
    };
  }
}
