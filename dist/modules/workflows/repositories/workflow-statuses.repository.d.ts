import { Repository } from 'typeorm';
import { WorkflowStatusEntity } from '../entities/workflow-status.entity';
export declare class WorkflowStatusesRepository {
    private readonly repo;
    constructor(repo: Repository<WorkflowStatusEntity>);
    findByWorkflow(workflowId: string): Promise<WorkflowStatusEntity[]>;
    findById(id: string): Promise<WorkflowStatusEntity | null>;
    create(data: Partial<WorkflowStatusEntity>): Promise<WorkflowStatusEntity>;
}
