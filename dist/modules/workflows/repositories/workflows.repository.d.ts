import { Repository } from 'typeorm';
import { WorkflowEntity } from '../entities/workflow.entity';
export declare class WorkflowsRepository {
    private readonly repo;
    constructor(repo: Repository<WorkflowEntity>);
    findById(id: string): Promise<WorkflowEntity | null>;
    findByProject(projectId: string): Promise<WorkflowEntity[]>;
    create(data: Partial<WorkflowEntity>): Promise<WorkflowEntity>;
}
