import { ProjectEntity } from '../../projects/entities/project.entity';
export declare class WorkflowEntity {
    id: string;
    projectId: string;
    name: string;
    isDefault: boolean;
    project?: ProjectEntity;
}
