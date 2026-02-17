import { Repository } from 'typeorm';
import { TaskAttachmentEntity } from '../entities/task-attachment.entity';
export declare class TaskAttachmentsRepository {
    private readonly repo;
    constructor(repo: Repository<TaskAttachmentEntity>);
    findByTask(taskId: string): Promise<TaskAttachmentEntity[]>;
    create(data: Partial<TaskAttachmentEntity>): Promise<TaskAttachmentEntity>;
}
