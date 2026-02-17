import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { getSkip } from '../../../common/pagination';
import { generateUuid } from '../../../common/utils/uuid.util';
import { TaskEntity } from '../entities/task.entity';

@Injectable()
export class TasksRepository {
  constructor(
    @InjectRepository(TaskEntity)
    private readonly repo: Repository<TaskEntity>,
  ) {}

  async findById(id: string): Promise<TaskEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByIdAndOrganization(id: string, organizationId: string): Promise<TaskEntity | null> {
    return this.repo.findOne({ where: { id, organizationId } });
  }

  async findByProject(projectId: string, page: number, limit: number): Promise<[TaskEntity[], number]> {
    return this.repo.findAndCount({
      where: { projectId },
      order: { createdAt: 'DESC' },
      skip: getSkip(page, limit),
      take: limit,
    });
  }

  async create(data: Partial<TaskEntity>): Promise<TaskEntity> {
    const id = data.id ?? generateUuid();
    const entity = this.repo.create({ ...data, id });
    return this.repo.save(entity);
  }

  async update(id: string, data: Partial<TaskEntity>): Promise<void> {
    await this.repo.update(id, data);
  }
}
