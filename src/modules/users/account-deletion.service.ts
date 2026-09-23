import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { uuidBinaryTransformer } from '../../common/base.entity';
import { OrganizationsRepository } from '../organizations/repositories/organizations.repository';
import {
  IOrganizationMembersRepository,
  ORGANIZATION_MEMBERS_REPOSITORY,
} from '../organizations/repositories/organization-members.repository.interface';
import { UsersRepository } from './repositories/users.repository';

/**
 * Shared account / org hard-delete (no AdminModule import — avoids Nest circular deps).
 */
@Injectable()
export class AccountDeletionService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly organizationsRepository: OrganizationsRepository,
    @Inject(ORGANIZATION_MEMBERS_REPOSITORY)
    private readonly orgMembersRepo: IOrganizationMembersRepository,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

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

  /** Delete all workspaces owned by a user, then remove the user account. */
  async deleteUserCompletely(userId: string): Promise<{
    success: true;
    deletedUserId: string;
    deletedOrganizationIds: string[];
  }> {
    const user = await this.usersRepository.findById(userId);
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

    const stillExists = await this.usersRepository.findById(userId);
    if (stillExists) {
      throw new ForbiddenException(
        'User could not be fully removed. Delete any remaining organizations they belong to first.',
      );
    }

    return { success: true, deletedUserId: userId, deletedOrganizationIds };
  }

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
}
