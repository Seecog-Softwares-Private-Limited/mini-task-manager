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

  async findRecurringByProject(projectId: string, organizationId: string): Promise<TaskEntity[]> {
    return this.repo
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .where('task.project_id = :projectId', { projectId })
      .andWhere('task.organization_id = :organizationId', { organizationId })
      .andWhere(
        `(task.recurring_template_id IS NOT NULL OR (task.recurrence_type IS NOT NULL AND task.recurrence_type != 'NONE'))`,
      )
      .orderBy('task.dueDate', 'ASC')
      .addOrderBy('task.createdAt', 'DESC')
      .take(500)
      .getMany();
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
    await this.repo.save(entity);
    return (await this.findById(id)) ?? entity;
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

  /** Find a task whose JSON subtasks array contains the given subtask id. */
  async findBySubtaskId(subtaskId: string, organizationId: string): Promise<TaskEntity | null> {
    const rows = await this.repo
      .createQueryBuilder('task')
      .where('task.organization_id = :organizationId', { organizationId })
      .andWhere('task.subtasks IS NOT NULL')
      .andWhere(
        `JSON_SEARCH(
          CAST(task.subtasks AS JSON),
          :searchMode,
          :subtaskId,
          NULL,
          :jsonPath
        ) IS NOT NULL`,
        {
          searchMode: 'one',
          subtaskId,
          jsonPath: '$[*].id',
        },
      )
      .limit(1)
      .getMany();
    if (rows[0]) return rows[0];

    // Fallback when JSON_SEARCH misses (e.g. legacy text-encoded subtasks).
    const candidates = await this.repo.find({
      where: { organizationId },
      select: ['id', 'projectId', 'organizationId', 'subtasks'],
      take: 500,
      order: { updatedAt: 'DESC' },
    });
    return candidates.find((task) => task.subtasks?.some((s) => s.id === subtaskId)) ?? null;
  }
}
