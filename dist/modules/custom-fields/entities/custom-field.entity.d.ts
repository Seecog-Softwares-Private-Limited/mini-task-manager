import { ProjectEntity } from '../../projects/entities/project.entity';
export declare class CustomFieldEntity {
    id: string;
    projectId: string;
    name: string;
    fieldType: string;
    isRequired: boolean;
    project?: ProjectEntity;
}
