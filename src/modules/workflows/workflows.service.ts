import { Injectable } from '@nestjs/common';
import { WorkflowsRepository } from './repositories/workflows.repository';
import { WorkflowStatusesRepository } from './repositories/workflow-statuses.repository';
import { ProjectsService } from '../projects/projects.service';
import { WorkflowEntity } from './entities/workflow.entity';
import { CreateWorkflowDto } from './dto/create-workflow.dto';

const DEFAULT_STATUSES = [
  { name: 'To Do', position: 0, type: 'TODO' },
  { name: 'In Progress', position: 1, type: 'IN_PROGRESS' },
  { name: 'Done', position: 2, type: 'DONE' },
];

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

  /**
   * Creates a default workflow with To Do / In Progress / Done statuses for a project.
   * Idempotent: if a default workflow already exists, ensures statuses exist too.
   */
  async createDefaultWorkflow(projectId: string): Promise<WorkflowEntity> {
    const existing = await this.workflowsRepository.findByProject(projectId);
    let workflow = existing.find((w) => w.isDefault);

    if (!workflow) {
      workflow = await this.workflowsRepository.create({
        projectId,
        name: 'Default',
        isDefault: true,
      });
    }

    // Ensure statuses exist (handles case where workflow was created without statuses)
    const currentStatuses = await this.workflowStatusesRepository.findByWorkflow(workflow.id);
    if (currentStatuses.length === 0) {
      for (const s of DEFAULT_STATUSES) {
        await this.workflowStatusesRepository.create({
          workflowId: workflow.id,
          name: s.name,
          position: s.position,
          type: s.type,
        });
      }
    }

    return workflow;
  }
}
