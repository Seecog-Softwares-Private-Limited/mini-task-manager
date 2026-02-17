import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { generateUuid } from '../../../common/utils/uuid.util';
import { TaskCustomFieldValueEntity } from '../entities/task-custom-field-value.entity';

@Injectable()
export class TaskCustomFieldValuesRepository {
  constructor(
    @InjectRepository(TaskCustomFieldValueEntity)
    private readonly repo: Repository<TaskCustomFieldValueEntity>,
  ) {}

  async findByTask(taskId: string): Promise<TaskCustomFieldValueEntity[]> {
    return this.repo.find({ where: { taskId } });
  }

  async upsert(data: Partial<TaskCustomFieldValueEntity>): Promise<TaskCustomFieldValueEntity> {
    const id = data.id ?? generateUuid();
    const entity = this.repo.create({ ...data, id });
    return this.repo.save(entity);
  }
}
