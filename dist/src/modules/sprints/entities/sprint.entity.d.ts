import { ProjectEntity } from '../../projects/entities/project.entity';
export declare class SprintEntity {
    id: string;
    projectId: string;
    name: string;
    startDate: Date | null;
    endDate: Date | null;
    status: string;
    createdAt: Date;
    project?: ProjectEntity;
}
