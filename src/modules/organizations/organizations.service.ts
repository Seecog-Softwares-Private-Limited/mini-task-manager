import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { QueryFailedError } from 'typeorm';
import { OrganizationsRepository } from './repositories/organizations.repository';
import { OrganizationMembersRepository } from './repositories/organization-members.repository';
import { OrganizationEntity } from './entities/organization.entity';
import { OrganizationMemberEntity } from './entities/organization-member.entity';
import { CreateOrganizationDto } from './dto/create-organization.dto';
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

  async update(id: string, dto: { isArchived?: boolean }): Promise<OrganizationEntity | null> {
    const org = await this.organizationsRepository.findById(id);
    if (!org) return null;
    if (dto.isArchived !== undefined) {
      await this.organizationsRepository.update(id, { isArchived: dto.isArchived });
      return { ...org, isArchived: dto.isArchived } as OrganizationEntity;
    }
    return org;
  }

  /** Returns the user's membership in the organization (for role display). */
  async getMembership(organizationId: string, userId: string): Promise<OrganizationMemberEntity | null> {
    const m = await this.orgMembersRepository.findByOrganizationAndUser(organizationId, userId);
    return m && m.status === 'ACTIVE' ? m : null;
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
