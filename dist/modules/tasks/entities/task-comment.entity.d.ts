import { TaskEntity } from './task.entity';
import { UserEntity } from '../../users/entities/user.entity';
export declare class TaskCommentEntity {
    id: string;
    taskId: string;
    userId: string;
    comment: string;
    createdAt: Date;
    task?: TaskEntity;
    user?: UserEntity;
}
