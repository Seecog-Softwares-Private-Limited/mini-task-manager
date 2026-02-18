import { WorkflowEntity } from './workflow.entity';
export declare class WorkflowStatusEntity {
    id: string;
    workflowId: string;
    name: string;
    position: number;
    color: string | null;
    type: string;
    workflow?: WorkflowEntity;
}
