import { DataSource } from 'typeorm';
import { WorkflowsRepository } from './repositories/workflows.repository';
import { WorkflowStatusesRepository } from './repositories/workflow-statuses.repository';
import { ProjectsService } from '../projects/projects.service';
import { WorkflowEntity } from './entities/workflow.entity';
import { WorkflowStatusEntity } from './entities/workflow-status.entity';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
export declare class WorkflowsService {
    private readonly workflowsRepository;
    private readonly workflowStatusesRepository;
    private readonly projectsService;
    private readonly dataSource;
    constructor(workflowsRepository: WorkflowsRepository, workflowStatusesRepository: WorkflowStatusesRepository, projectsService: ProjectsService, dataSource: DataSource);
    findById(id: string): Promise<WorkflowEntity | null>;
    findByIdInOrganization(id: string, organizationId: string): Promise<WorkflowEntity | null>;
    findByProject(projectId: string, organizationId: string): Promise<WorkflowEntity[]>;
    create(projectId: string, dto: CreateWorkflowDto): Promise<WorkflowEntity>;
    getStatuses(workflowId: string): Promise<WorkflowStatusEntity[]>;
    createDefaultWorkflow(projectId: string, organizationId?: string): Promise<WorkflowEntity>;
}
