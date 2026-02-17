import { Injectable } from '@nestjs/common';
import { OrganizationsRepository } from './repositories/organizations.repository';
import { OrganizationMembersRepository } from './repositories/organization-members.repository';
import { OrganizationEntity } from './entities/organization.entity';
import { OrganizationMemberEntity } from './entities/organization-member.entity';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { OrganizationResponseDto } from './dto/organization-response.dto';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly organizationsRepository: OrganizationsRepository,
    private readonly orgMembersRepository: OrganizationMembersRepository,
  ) {}

  async findById(id: string): Promise<OrganizationEntity | null> {
    return this.organizationsRepository.findById(id);
  }

  async findBySlug(slug: string): Promise<OrganizationEntity | null> {
    return this.organizationsRepository.findBySlug(slug);
  }

  async create(ownerId: string, dto: CreateOrganizationDto): Promise<OrganizationEntity> {
    const org = await this.organizationsRepository.create({
      name: dto.name,
      slug: dto.slug,
      ownerId,
    });
    await this.orgMembersRepository.create({
      organizationId: org.id,
      userId: ownerId,
      role: 'OWNER',
      status: 'ACTIVE',
    });
    return org;
  }

  async getMembers(organizationId: string): Promise<OrganizationMemberEntity[]> {
    return this.orgMembersRepository.findByOrganization(organizationId);
  }

  /** Returns true if the user is an active member of the organization. Used for tenant-scoped access without TenantGuard. */
  async canAccess(organizationId: string, userId: string): Promise<boolean> {
    const membership = await this.orgMembersRepository.findByOrganizationAndUser(organizationId, userId);
    return membership != null && membership.status === 'ACTIVE';
  }
}
