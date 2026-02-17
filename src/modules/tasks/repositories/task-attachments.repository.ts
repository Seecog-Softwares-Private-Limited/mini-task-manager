import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { generateUuid } from '../../../common/utils/uuid.util';
import { TaskAttachmentEntity } from '../entities/task-attachment.entity';

@Injectable()
export class TaskAttachmentsRepository {
  constructor(
    @InjectRepository(TaskAttachmentEntity)
    private readonly repo: Repository<TaskAttachmentEntity>,
  ) {}

  async findByTask(taskId: string): Promise<TaskAttachmentEntity[]> {
    return this.repo.find({ where: { taskId }, order: { uploadedAt: 'DESC' } });
  }

  async create(data: Partial<TaskAttachmentEntity>): Promise<TaskAttachmentEntity> {
    const id = data.id ?? generateUuid();
    const entity = this.repo.create({ ...data, id });
    return this.repo.save(entity);
  }
}
