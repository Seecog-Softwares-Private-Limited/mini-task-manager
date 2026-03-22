import { Repository } from 'typeorm';
import { TaskCommentEntity } from '../entities/task-comment.entity';
export declare class TaskCommentsRepository {
    private readonly repo;
    constructor(repo: Repository<TaskCommentEntity>);
    findByTask(taskId: string): Promise<TaskCommentEntity[]>;
    findById(id: string): Promise<TaskCommentEntity | null>;
    delete(id: string): Promise<void>;
    create(data: Partial<TaskCommentEntity>): Promise<TaskCommentEntity>;
}
