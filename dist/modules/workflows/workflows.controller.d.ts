import { WorkflowsService } from './workflows.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { WorkflowResponseDto } from './dto/workflow-response.dto';
import { WorkflowStatusResponseDto } from './dto/workflow-status-response.dto';
export declare class WorkflowsController {
    private readonly workflowsService;
    constructor(workflowsService: WorkflowsService);
    create(dto: CreateWorkflowDto): Promise<WorkflowResponseDto>;
    findByProject(projectId: string, tenantId: string): Promise<WorkflowResponseDto[]>;
    getStatuses(id: string, tenantId: string): Promise<WorkflowStatusResponseDto[]>;
    createDefault(projectId: string, tenantId: string): Promise<WorkflowResponseDto>;
    findOne(id: string, tenantId?: string): Promise<WorkflowResponseDto | null>;
}
