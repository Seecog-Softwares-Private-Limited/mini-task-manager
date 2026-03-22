import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { QueryFailedError } from 'typeorm';
import { OrganizationsRepository } from './repositories/organizations.repository';
import { OrganizationMembersRepository } from './repositories/organization-members.repository';
import { OrganizationEntity } from './entities/organization.entity';
import { OrganizationMemberEntity } from './entities/organization-member.entity';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationResponseDto } from './dto/organization-response.dto';
import { generateUuid } from '../../common/utils/uuid.util';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly organizationsRepository: OrganizationsRepository,
    private readonly orgMembersRepository: OrganizationMembersRepository,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async findById(id: string): Promise<OrganizationEntity | null> {
    return this.organizationsRepository.findById(id);
  }

  async findBySlug(slug: string): Promise<OrganizationEntity | null> {
    return this.organizationsRepository.findBySlug(slug);
  }

  /** Returns organizations the user is an active member of (for org selector). */
  async findOrganizationsForUser(userId: string): Promise<OrganizationEntity[]> {
    const memberships = await this.orgMembersRepository.findByUser(userId);
    const orgs: OrganizationEntity[] = [];
    for (const m of memberships) {
      const org = await this.organizationsRepository.findById(m.organizationId);
      if (org) orgs.push(org);
    }
    return orgs;
  }

  /** Returns organizations with the current user's role (for org dashboard cards). */
  async findOrganizationsWithRoleForUser(userId: string): Promise<{ org: OrganizationEntity; role: string }[]> {
    const memberships = await this.orgMembersRepository.findByUser(userId);
    const result: { org: OrganizationEntity; role: string }[] = [];
    for (const m of memberships) {
      if (m.status !== 'ACTIVE') continue;
      const org = await this.organizationsRepository.findById(m.organizationId);
      if (org) result.push({ org, role: m.role });
    }
    return result;
  }

  async create(ownerId: string, dto: CreateOrganizationDto): Promise<OrganizationEntity> {
    const existing = await this.organizationsRepository.findBySlug(dto.slug);
    if (existing) {
      throw new ConflictException('An organization with this slug already exists. Please choose a different slug.');
    }

    const orgId = generateUuid();
    try {
      return await this.dataSource.transaction(async (manager) => {
        const orgRepo = manager.getRepository(OrganizationEntity);
        const memberRepo = manager.getRepository(OrganizationMemberEntity);
        const orgEntity = orgRepo.create({
          id: orgId,
          name: dto.name,
          slug: dto.slug,
          ownerId,
          logoUrl: dto.logoUrl ?? null,
          isArchived: false,
        });
        await orgRepo.save(orgEntity);
        const memberEntity = memberRepo.create({
          id: generateUuid(),
          organizationId: orgId,
          userId: ownerId,
          role: 'owner',
          status: 'ACTIVE',
        });
        await memberRepo.save(memberEntity);
        return orgEntity;
      });
    } catch (err) {
      const driverError = err instanceof QueryFailedError ? (err as QueryFailedError).driverError : null;
      const isDup =
        (driverError && (driverError as { code?: string; errno?: number }).code === 'ER_DUP_ENTRY') ||
        (driverError && (driverError as { errno?: number }).errno === 1062) ||
        (err instanceof Error && err.message.includes('Duplicate entry'));
      if (isDup) {
        throw new ConflictException('An organization with this slug already exists. Please choose a different slug.');
      }
      throw err;
    }
  }

  async getMembers(organizationId: string): Promise<OrganizationMemberEntity[]> {
    return this.orgMembersRepository.findByOrganizationWithUser(organizationId);
  }

  async getMemberCount(organizationId: string): Promise<number> {
    return this.orgMembersRepository.countByOrganization(organizationId);
  }

  /** Returns true if the user is an active member of the organization. Used for tenant-scoped access without TenantGuard. */
  async canAccess(organizationId: string, userId: string): Promise<boolean> {
    const membership = await this.orgMembersRepository.findByOrganizationAndUser(organizationId, userId);
    return membership != null && membership.status === 'ACTIVE';
  }

  async update(id: string, dto: UpdateOrganizationDto): Promise<OrganizationEntity | null> {
    const org = await this.organizationsRepository.findById(id);
    if (!org) return null;

    const patch: Partial<Pick<OrganizationEntity, 'name' | 'slug' | 'logoUrl' | 'isArchived'>> = {};

    if (dto.isArchived !== undefined) {
      patch.isArchived = dto.isArchived;
    }
    if (dto.name !== undefined) {
      const trimmed = dto.name.trim();
      if (!trimmed) {
        throw new BadRequestException('Workspace name cannot be empty');
      }
      patch.name = trimmed;
    }
    if (dto.slug !== undefined) {
      const nextSlug = dto.slug.trim().toLowerCase();
      if (!nextSlug) {
        throw new BadRequestException('URL slug cannot be empty');
      }
      if (nextSlug !== org.slug) {
        const taken = await this.organizationsRepository.findBySlug(nextSlug);
        if (taken && taken.id !== id) {
          throw new ConflictException('A workspace with this slug already exists. Please choose a different slug.');
        }
      }
      patch.slug = nextSlug;
    }
    if (dto.logoUrl !== undefined) {
      const v = dto.logoUrl.trim();
      patch.logoUrl = v.length === 0 ? null : dto.logoUrl;
    }

    if (Object.keys(patch).length > 0) {
      try {
        await this.organizationsRepository.update(id, patch);
      } catch (err) {
        const driverError = err instanceof QueryFailedError ? (err as QueryFailedError).driverError : null;
        const isDup =
          (driverError && (driverError as { code?: string }).code === 'ER_DUP_ENTRY') ||
          (driverError && (driverError as { errno?: number }).errno === 1062) ||
          (err instanceof Error && err.message.includes('Duplicate entry'));
        if (isDup) {
          throw new ConflictException('A workspace with this slug already exists. Please choose a different slug.');
        }
        throw err;
      }
    }

    return this.organizationsRepository.findById(id);
  }

  /** Returns the user's membership in the organization (for role display). */
  async getMembership(organizationId: string, userId: string): Promise<OrganizationMemberEntity | null> {
    const m = await this.orgMembersRepository.findByOrganizationAndUser(organizationId, userId);
    return m && m.status === 'ACTIVE' ? m : null;
  }

  /** Returns workspace-progress flags for onboarding reconciliation. */
  async getWorkspaceProgress(organizationId: string): Promise<{
    hasProjects: boolean;
    hasMembers: boolean;
    hasTasks: boolean;
  }> {
    const [projectCount] = await this.dataSource.query(
      `SELECT COUNT(*) as cnt FROM projects WHERE organization_id = ?`,
      [organizationId],
    );
    // Count active members excluding the org owner (>1 means someone accepted an invite)
    const [memberCount] = await this.dataSource.query(
      `SELECT COUNT(*) as cnt FROM organization_members WHERE organization_id = ? AND status = 'ACTIVE'`,
      [organizationId],
    );
    const [taskCount] = await this.dataSource.query(
      `SELECT COUNT(*) as cnt FROM tasks WHERE organization_id = ?`,
      [organizationId],
    );
    return {
      hasProjects: Number(projectCount?.cnt ?? 0) > 0,
      hasMembers: Number(memberCount?.cnt ?? 0) > 1,
      hasTasks: Number(taskCount?.cnt ?? 0) > 0,
    };
  }

  /** Update a member's role. Owner or admin only. Cannot change owner role. */
  async updateMemberRole(
    organizationId: string,
    memberId: string,
    role: string,
    actorUserId: string,
  ): Promise<OrganizationMemberEntity> {
    const membership = await this.getMembership(organizationId, actorUserId);
    if (!membership) {
      throw new ForbiddenException('You do not have access to this organization');
    }
    const actorRole = membership.role?.toLowerCase();
    if (actorRole !== 'owner' && actorRole !== 'admin') {
      throw new ForbiddenException('Only owners and admins can update member roles');
    }

    const target = await this.orgMembersRepository.findById(memberId);
    if (!target) {
      throw new ForbiddenException('Member not found');
    }
    if (target.organizationId !== organizationId) {
      throw new ForbiddenException('Member does not belong to this organization');
    }
    if (target.role?.toLowerCase() === 'owner') {
      throw new ForbiddenException('Cannot change the owner role. Use transfer ownership instead.');
    }
    if (actorRole === 'admin' && target.role?.toLowerCase() === 'owner') {
      throw new ForbiddenException('Admins cannot modify the owner');
    }

    const normalizedRole = role?.trim().toLowerCase() || 'member';
    const allowedRoles = ['admin', 'member'];
    if (!allowedRoles.includes(normalizedRole)) {
      throw new ForbiddenException('Invalid role. Use admin or member.');
    }

    await this.orgMembersRepository.update(memberId, { role: normalizedRole });
    const updated = await this.orgMembersRepository.findById(memberId);
    if (!updated) throw new ForbiddenException('Member not found');
    return updated;
  }

  /** Remove a member from the organization. Owner or admin only. Cannot remove owner. */
  async removeMember(
    organizationId: string,
    memberId: string,
    actorUserId: string,
  ): Promise<void> {
    const membership = await this.getMembership(organizationId, actorUserId);
    if (!membership) {
      throw new ForbiddenException('You do not have access to this organization');
    }
    const actorRole = membership.role?.toLowerCase();
    if (actorRole !== 'owner' && actorRole !== 'admin') {
      throw new ForbiddenException('Only owners and admins can remove members');
    }

    const target = await this.orgMembersRepository.findById(memberId);
    if (!target) {
      throw new ForbiddenException('Member not found');
    }
    if (target.organizationId !== organizationId) {
      throw new ForbiddenException('Member does not belong to this organization');
    }
    if (target.role?.toLowerCase() === 'owner') {
      throw new ForbiddenException('Cannot remove the owner. Use transfer ownership first.');
    }

    await this.orgMembersRepository.update(memberId, { status: 'REMOVED' });
  }

  /** Delete organization. Owner only. */
  async delete(id: string, userId: string): Promise<void> {
    const membership = await this.getMembership(id, userId);
    if (!membership) {
      throw new ForbiddenException('You do not have access to this organization');
    }
    if (membership.role?.toLowerCase() !== 'owner') {
      throw new ForbiddenException('Only the organization owner can delete the organization');
    }
    await this.organizationsRepository.delete(id);
  }
}
