import { TaskEntity } from './task.entity';
import { UserEntity } from '../../users/entities/user.entity';
export declare class TaskAttachmentEntity {
    id: string;
    taskId: string;
    fileUrl: string;
    fileName: string | null;
    uploadedBy: string;
    uploadedAt: Date;
    task?: TaskEntity;
    uploader?: UserEntity;
}
