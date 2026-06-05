import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { generateUuid } from '../../../common/utils/uuid.util';
import { OrganizationInvitationEntity } from '../entities/organization-invitation.entity';

@Injectable()
export class InvitationsRepository {
  constructor(
    @InjectRepository(OrganizationInvitationEntity)
    private readonly repo: Repository<OrganizationInvitationEntity>,
  ) {}

  async findById(id: string): Promise<OrganizationInvitationEntity | null> {
    return this.repo.findOne({ where: { id }, relations: ['organization', 'inviter'] });
  }

  async findByToken(token: string): Promise<OrganizationInvitationEntity | null> {
    return this.repo.findOne({ where: { token }, relations: ['organization', 'inviter'] });
  }

  async findPendingByOrgAndEmail(
    organizationId: string,
    email: string,
  ): Promise<OrganizationInvitationEntity | null> {
    return this.repo.findOne({
      where: { organizationId, email, status: 'PENDING' },
    });
  }

  async findByOrganization(organizationId: string): Promise<OrganizationInvitationEntity[]> {
    return this.repo.find({
      where: { organizationId },
      relations: ['inviter'],
      order: { createdAt: 'DESC' },
    });
  }

  async findPendingByEmail(email: string): Promise<OrganizationInvitationEntity[]> {
    return this.repo.find({
      where: { email: email.toLowerCase(), status: 'PENDING' },
      relations: ['organization', 'inviter'],
      order: { createdAt: 'DESC' },
    });
  }

  async create(data: Partial<OrganizationInvitationEntity>): Promise<OrganizationInvitationEntity> {
    const id = data.id ?? generateUuid();
    const entity = this.repo.create({ ...data, id });
    return this.repo.save(entity);
  }

  async updateStatus(id: string, status: string): Promise<void> {
    await this.repo.update(id, { status });
  }

  async updateTokenAndExpiry(id: string, token: string, expiresAt: Date): Promise<void> {
    await this.repo.update(id, { token, expiresAt, status: 'PENDING' });
  }
}
