import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { generateUuid } from '../../../common/utils/uuid.util';
import { TaskCommentEntity } from '../entities/task-comment.entity';

@Injectable()
export class TaskCommentsRepository {
  constructor(
    @InjectRepository(TaskCommentEntity)
    private readonly repo: Repository<TaskCommentEntity>,
  ) {}

  async findByTask(taskId: string): Promise<TaskCommentEntity[]> {
    return this.repo.find({ where: { taskId }, order: { createdAt: 'ASC' } });
  }

  async create(data: Partial<TaskCommentEntity>): Promise<TaskCommentEntity> {
    const id = data.id ?? generateUuid();
    const entity = this.repo.create({ ...data, id });
    return this.repo.save(entity);
  }
}
