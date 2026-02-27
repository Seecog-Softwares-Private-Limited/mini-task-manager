import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { generateUuid } from '../../../common/utils/uuid.util';
import { OrganizationMemberEntity } from '../entities/organization-member.entity';
import { IOrganizationMembersRepository } from './organization-members.repository.interface';

@Injectable()
export class OrganizationMembersRepository implements IOrganizationMembersRepository {
  constructor(
    @InjectRepository(OrganizationMemberEntity)
    private readonly repo: Repository<OrganizationMemberEntity>,
  ) {}

  async findByOrganizationAndUser(organizationId: string, userId: string): Promise<OrganizationMemberEntity | null> {
    return this.repo.findOne({
      where: { organizationId, userId, status: 'ACTIVE' },
    });
  }

  async findByOrganization(organizationId: string): Promise<OrganizationMemberEntity[]> {
    return this.repo.find({ where: { organizationId }, order: { joinedAt: 'ASC' } });
  }

  async countByOrganization(organizationId: string): Promise<number> {
    return this.repo.count({ where: { organizationId, status: 'ACTIVE' } });
  }

  async findByOrganizationWithUser(organizationId: string): Promise<OrganizationMemberEntity[]> {
    return this.repo.find({
      where: { organizationId, status: 'ACTIVE' },
      order: { joinedAt: 'ASC' },
      relations: ['user'],
    });
  }

  async findByUser(userId: string): Promise<OrganizationMemberEntity[]> {
    return this.repo.find({
      where: { userId, status: 'ACTIVE' },
      order: { joinedAt: 'ASC' },
    });
  }

  async findById(id: string): Promise<OrganizationMemberEntity | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['user'],
    });
  }

  async create(data: Partial<OrganizationMemberEntity>): Promise<OrganizationMemberEntity> {
    const id = data.id ?? generateUuid();
    const entity = this.repo.create({ ...data, id });
    return this.repo.save(entity);
  }

  async update(id: string, data: Partial<OrganizationMemberEntity>): Promise<void> {
    await this.repo.update(id, data);
  }
}
