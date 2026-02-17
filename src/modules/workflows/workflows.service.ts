import { Injectable } from '@nestjs/common';
import { WorkflowsRepository } from './repositories/workflows.repository';
import { WorkflowStatusesRepository } from './repositories/workflow-statuses.repository';
import { ProjectsService } from '../projects/projects.service';
import { WorkflowEntity } from './entities/workflow.entity';
import { CreateWorkflowDto } from './dto/create-workflow.dto';

@Injectable()
export class WorkflowsService {
  constructor(
    private readonly workflowsRepository: WorkflowsRepository,
    private readonly workflowStatusesRepository: WorkflowStatusesRepository,
    private readonly projectsService: ProjectsService,
  ) {}

  async findById(id: string): Promise<WorkflowEntity | null> {
    return this.workflowsRepository.findById(id);
  }

  async findByIdInOrganization(id: string, organizationId: string): Promise<WorkflowEntity | null> {
    const workflow = await this.workflowsRepository.findById(id);
    if (!workflow) return null;
    const project = await this.projectsService.findByIdInOrganization(workflow.projectId, organizationId);
    if (!project) return null;
    return workflow;
  }

  async findByProject(projectId: string, organizationId: string): Promise<WorkflowEntity[]> {
    const project = await this.projectsService.findByIdInOrganization(projectId, organizationId);
    if (!project) return [];
    return this.workflowsRepository.findByProject(projectId);
  }

  async create(projectId: string, dto: CreateWorkflowDto): Promise<WorkflowEntity> {
    return this.workflowsRepository.create({
      projectId,
      name: dto.name,
      isDefault: dto.isDefault ?? true,
    });
  }

  async getStatuses(workflowId: string) {
    return this.workflowStatusesRepository.findByWorkflow(workflowId);
  }
}
