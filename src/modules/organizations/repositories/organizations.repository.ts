import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { generateUuid } from '../../../common/utils/uuid.util';
import { OrganizationEntity } from '../entities/organization.entity';

@Injectable()
export class OrganizationsRepository {
  constructor(
    @InjectRepository(OrganizationEntity)
    private readonly repo: Repository<OrganizationEntity>,
  ) {}

  async findById(id: string): Promise<OrganizationEntity | null> {
    return this.repo.findOne({ where: { id }, relations: ['owner'] });
  }

  async findBySlug(slug: string): Promise<OrganizationEntity | null> {
    return this.repo.findOne({ where: { slug } });
  }

  async findByOwnerId(ownerId: string): Promise<OrganizationEntity[]> {
    return this.repo.find({ where: { ownerId }, order: { createdAt: 'DESC' } });
  }

  async create(data: Partial<OrganizationEntity>): Promise<OrganizationEntity> {
    const id = data.id ?? generateUuid();
    const entity = this.repo.create({ ...data, id });
    return this.repo.save(entity);
  }

  async update(id: string, data: Partial<OrganizationEntity>): Promise<void> {
    await this.repo.update(id, data);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async findAllPaginated(params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
  }): Promise<{ items: OrganizationEntity[]; total: number }> {
    const qb = this.repo
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.owner', 'owner')
      .where('o.status != :deleted', { deleted: 'DELETED' });

    if (params.status && params.status !== 'ALL') {
      qb.andWhere('o.status = :status', { status: params.status });
    }

    const search = params.search?.trim();
    if (search) {
      qb.andWhere('(o.name LIKE :search OR o.slug LIKE :search OR owner.email LIKE :search)', {
        search: `%${search}%`,
      });
    }

    qb.orderBy('o.createdAt', 'DESC')
      .skip((params.page - 1) * params.limit)
      .take(params.limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }
}
