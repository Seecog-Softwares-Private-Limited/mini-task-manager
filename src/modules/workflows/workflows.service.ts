import {
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { WorkflowsRepository } from './repositories/workflows.repository';
import { WorkflowStatusesRepository } from './repositories/workflow-statuses.repository';
import { ProjectsService } from '../projects/projects.service';
import { WorkflowEntity } from './entities/workflow.entity';
import { WorkflowStatusEntity } from './entities/workflow-status.entity';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { generateUuid } from '../../common/utils/uuid.util';

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
    @Inject(forwardRef(() => ProjectsService))
    private readonly projectsService: ProjectsService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
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
   *
   * @param organizationId When set, verifies the project belongs to this org (avoids FK 500s and cross-tenant writes).
   */
  async createDefaultWorkflow(projectId: string, organizationId?: string): Promise<WorkflowEntity> {
    if (organizationId != null && organizationId !== '') {
      const project = await this.projectsService.findByIdInOrganization(projectId, organizationId);
      if (!project) {
        throw new NotFoundException('Project not found in this organization');
      }
    }

    /**
     * Run workflow + default statuses in one DB transaction and reload the workflow row
     * before inserting statuses. Fixes intermittent FK failures (`fk_status_workflow` /
     * `fk_workflow_statuses_workflow`) when BINARY(16) ids were not aligned between
     * separate TypeORM operations.
     */
    return await this.dataSource.transaction(async (manager) => {
      const wfRepo = manager.getRepository(WorkflowEntity);
      const stRepo = manager.getRepository(WorkflowStatusEntity);

      const existing = await wfRepo.find({
        where: { projectId },
        order: { name: 'ASC' },
      });
      let workflow = existing.find((w) => !!w.isDefault);

      if (!workflow) {
        workflow = await wfRepo.save(
          wfRepo.create({
            id: generateUuid(),
            projectId,
            name: 'Default',
            isDefault: true,
          }),
        );
        await manager.query('SELECT 1');
      }


      const currentStatuses = await stRepo.find({
        where: { workflowId: workflow.id },
        order: { position: 'ASC' },
      });

      if (currentStatuses.length === 0) {
        for (const s of DEFAULT_STATUSES) {
          await stRepo.save(
            stRepo.create({
              id: generateUuid(),
              workflowId: String(workflow.id),
              name: s.name,
              position: s.position,
              type: s.type,
              color: null,
            }),
          );
        }
      }

      return workflow;
    });
  }
}
