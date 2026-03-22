import { ProjectEntity } from './project.entity';
import { UserEntity } from '../../users/entities/user.entity';
export declare class ProjectMemberEntity {
    id: string;
    projectId: string;
    userId: string;
    role: string;
    project?: ProjectEntity;
    user?: UserEntity;
}
