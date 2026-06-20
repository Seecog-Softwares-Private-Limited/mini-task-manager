import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { generateUuid } from '../../../common/utils/uuid.util';
import { TaskTimeEntryEntity } from '../entities/task-time-entry.entity';

@Injectable()
export class TaskTimeEntriesRepository {
  constructor(
    @InjectRepository(TaskTimeEntryEntity)
    private readonly repo: Repository<TaskTimeEntryEntity>,
  ) {}

  findByTask(taskId: string): Promise<TaskTimeEntryEntity[]> {
    return this.repo.find({ where: { taskId }, order: { loggedAt: 'DESC' } });
  }

  sumMinutesByTask(taskId: string): Promise<number> {
    return this.repo
      .createQueryBuilder('e')
      .select('COALESCE(SUM(e.minutes), 0)', 'total')
      .where('e.task_id = :taskId', { taskId })
      .getRawOne()
      .then((r) => Number(r?.total ?? 0));
  }

  async create(data: Partial<TaskTimeEntryEntity>): Promise<TaskTimeEntryEntity> {
    const entity = this.repo.create({ ...data, id: data.id ?? generateUuid() });
    return this.repo.save(entity);
  }
}
