import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { generateUuid } from '../../../common/utils/uuid.util';
import { ProjectEntity } from '../entities/project.entity';

@Injectable()
export class ProjectsRepository {
  constructor(
    @InjectRepository(ProjectEntity)
    private readonly repo: Repository<ProjectEntity>,
  ) {}

  async findById(id: string): Promise<ProjectEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByIdAndOrganization(id: string, organizationId: string): Promise<ProjectEntity | null> {
    return this.repo.findOne({ where: { id, organizationId } });
  }

  async findByOrganization(organizationId: string): Promise<ProjectEntity[]> {
    return this.repo.find({
      where: { organizationId, isArchived: false },
      order: { createdAt: 'DESC' },
    });
  }

  async create(data: Partial<ProjectEntity>): Promise<ProjectEntity> {
    const id = data.id ?? generateUuid();
    const entity = this.repo.create({ ...data, id });
    return this.repo.save(entity);
  }

  async update(id: string, data: Partial<ProjectEntity>): Promise<void> {
    await this.repo.update(id, data);
  }
}
