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
    return this.repo.findOne({ where: { id }, relations: ['assignee'] });
  }

  async findByIdAndOrganization(id: string, organizationId: string): Promise<TaskEntity | null> {
    return this.repo.findOne({ where: { id, organizationId }, relations: ['assignee'] });
  }

  async findByProject(projectId: string, page: number, limit: number): Promise<[TaskEntity[], number]> {
    return this.repo.findAndCount({
      where: { projectId },
      relations: ['assignee'],
      order: { createdAt: 'DESC' },
      skip: getSkip(page, limit),
      take: limit,
    });
  }

  async countByProject(projectId: string): Promise<number> {
    return this.repo.count({ where: { projectId } });
  }

  async countByOrganization(organizationId: string): Promise<number> {
    return this.repo.count({ where: { organizationId } });
  }

  async create(data: Partial<TaskEntity>): Promise<TaskEntity> {
    const id = data.id ?? generateUuid();
    const payload = { ...data, id };
    // Ensure statusId is null (not invalid FK) when not a valid workflow status
    if (payload.statusId === undefined || payload.statusId === '') {
      payload.statusId = null;
    }
    const entity = this.repo.create(payload);
    return this.repo.save(entity);
  }

  async update(id: string, data: Partial<TaskEntity>): Promise<void> {
    await this.repo.update(id, data);
  }

  async clearParentReferences(parentTaskId: string): Promise<void> {
    await this.repo.update({ parentTaskId }, { parentTaskId: null });
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
