import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { generateUuid } from '../../../common/utils/uuid.util';
import { IssueEntity } from '../entities/issue.entity';

@Injectable()
export class IssuesRepository {
  constructor(
    @InjectRepository(IssueEntity)
    private readonly repo: Repository<IssueEntity>,
  ) {}

  async findById(id: string): Promise<IssueEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByIdAndOrganization(id: string, organizationId: string): Promise<IssueEntity | null> {
    return this.repo.findOne({ where: { id, organizationId } });
  }

  async findByOrganization(
    organizationId: string,
    filters?: { projectId?: string; status?: string },
  ): Promise<IssueEntity[]> {
    return this.repo.find({
      where: {
        organizationId,
        ...(filters?.projectId ? { projectId: filters.projectId } : {}),
        ...(filters?.status ? { status: filters.status as IssueEntity['status'] } : {}),
      },
      order: { createdAt: 'DESC' },
      take: 1000,
    });
  }

  async create(data: Partial<IssueEntity>): Promise<IssueEntity> {
    const id = data.id ?? generateUuid();
    const entity = this.repo.create({ ...data, id });
    await this.repo.save(entity);
    return this.findById(id) as Promise<IssueEntity>;
  }

  async update(id: string, data: Partial<IssueEntity>): Promise<void> {
    await this.repo.update(id, data);
  }
}
