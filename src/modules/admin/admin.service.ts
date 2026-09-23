import { Injectable, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { OrganizationsRepository } from '../organizations/repositories/organizations.repository';
import {
  IOrganizationMembersRepository,
  ORGANIZATION_MEMBERS_REPOSITORY,
} from '../organizations/repositories/organization-members.repository.interface';
import { BillingService } from '../billing/billing.service';
import { UsersService } from '../users/users.service';
import { AccountDeletionService } from '../users/account-deletion.service';
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
    private readonly accountDeletionService: AccountDeletionService,
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
    return this.accountDeletionService.deleteOrganizationPermanently(organizationId);
  }

  /** Delete all workspaces owned by a user, then remove the user account. */
  async deleteUserCompletely(userId: string): Promise<{
    success: true;
    deletedUserId: string;
    deletedOrganizationIds: string[];
  }> {
    return this.accountDeletionService.deleteUserCompletely(userId);
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
