import { ConflictException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ProjectsRepository } from './repositories/projects.repository';
import { ProjectMembersRepository } from './repositories/project-members.repository';
import { ProjectEntity } from './entities/project.entity';
import { ProjectMemberEntity } from './entities/project-member.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { TasksRepository } from '../tasks/repositories/tasks.repository';
import { WorkflowsService } from '../workflows/workflows.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

const DEMO_TASKS = [
  { title: 'Review project requirements', description: 'Go through the initial brief and clarify any questions.' },
  { title: 'Set up development environment', description: 'Install dependencies and configure your local setup.' },
  { title: 'Create first milestone', description: 'Define and document the first project milestone.' },
];

@Injectable()
export class ProjectsService {
  constructor(
    private readonly projectsRepository: ProjectsRepository,
    private readonly projectMembersRepository: ProjectMembersRepository,
    @Inject(forwardRef(() => TasksRepository))
    private readonly tasksRepository: TasksRepository,
    @Inject(forwardRef(() => WorkflowsService))
    private readonly workflowsService: WorkflowsService,
    private readonly activityLogsService: ActivityLogsService,
  ) {}

  async findById(id: string): Promise<ProjectEntity | null> {
    return this.projectsRepository.findById(id);
  }

  async findByIdInOrganization(id: string, organizationId: string): Promise<ProjectEntity | null> {
    return this.projectsRepository.findByIdAndOrganization(id, organizationId);
  }

  async findByOrganization(organizationId: string): Promise<ProjectEntity[]> {
    return this.projectsRepository.findByOrganization(organizationId);
  }

  async countByOrganization(organizationId: string): Promise<number> {
    return this.projectsRepository.countByOrganization(organizationId);
  }

  async create(organizationId: string, createdBy: string, dto: CreateProjectDto): Promise<ProjectEntity> {
    const existingProject = await this.projectsRepository.findByName(
      dto.name,
      organizationId,
    );
    
    if (existingProject) {
      throw new ConflictException('Project name already exists');
    }
    const iconTrimmed = dto.iconUrl?.trim();
    const project = await this.projectsRepository.create({
      organizationId,
      createdBy,
      name: dto.name,
      description: dto.description ?? null,
      iconUrl: iconTrimmed && iconTrimmed.length > 0 ? dto.iconUrl! : null,
      visibility: dto.visibility ?? 'PRIVATE',
    });
    this.activityLogsService
      .log({ organizationId, userId: createdBy, entityType: 'project', entityId: project.id, action: 'create', metadata: { name: project.name } })
      .catch(() => {});
    return project;
  }

  async update(
    id: string,
    organizationId: string,
    dto: UpdateProjectDto,
    userId?: string,
  ): Promise<ProjectEntity> {
    const project = await this.projectsRepository.findByIdAndOrganization(id, organizationId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    const payload: Partial<ProjectEntity> = {};
    if (dto.name !== undefined) payload.name = dto.name;
    if (dto.description !== undefined) payload.description = dto.description ?? null;
    if (dto.iconUrl !== undefined) {
      const v = dto.iconUrl.trim();
      payload.iconUrl = v.length === 0 ? null : dto.iconUrl;
    }
    if (dto.visibility !== undefined) payload.visibility = dto.visibility;
    if (dto.isArchived !== undefined) payload.isArchived = dto.isArchived;
    if (Object.keys(payload).length === 0) return project;
    await this.projectsRepository.update(id, payload);
    const updated = await this.projectsRepository.findByIdAndOrganization(id, organizationId);
    this.activityLogsService
      .log({ organizationId, userId: userId ?? undefined, entityType: 'project', entityId: id, action: 'update', metadata: { name: updated?.name ?? project.name } })
      .catch(() => {});
    return updated!;
  }

  // ── Project Members ──

  async getProjectMembers(projectId: string): Promise<ProjectMemberEntity[]> {
    return this.projectMembersRepository.findByProjectWithUser(projectId);
  }

  async addProjectMember(projectId: string, userId: string, role: string): Promise<ProjectMemberEntity> {
    const existing = await this.projectMembersRepository.findByProjectAndUser(projectId, userId);
    if (existing) {
      throw new ConflictException('User is already a member of this project');
    }
    const member = await this.projectMembersRepository.create({ projectId, userId, role });
    const withUser = await this.projectMembersRepository.findById(member.id);
    return withUser ?? member;
  }

  async updateProjectMemberRole(memberId: string, role: string): Promise<ProjectMemberEntity> {
    const member = await this.projectMembersRepository.findById(memberId);
    if (!member) throw new NotFoundException('Project member not found');
    await this.projectMembersRepository.updateRole(memberId, role);
    return { ...member, role };
  }

  async removeProjectMember(memberId: string): Promise<void> {
    const member = await this.projectMembersRepository.findById(memberId);
    if (!member) throw new NotFoundException('Project member not found');
    await this.projectMembersRepository.delete(memberId);
  }

  /** Seeds 3 demo tasks if project has no tasks. Returns count of tasks created. */
  async seedDemoTasks(
    projectId: string,
    organizationId: string,
    reporterId: string,
  ): Promise<{ created: number }> {
    const project = await this.projectsRepository.findByIdAndOrganization(projectId, organizationId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    const count = await this.tasksRepository.countByProject(projectId);
    if (count > 0) {
      return { created: 0 };
    }
    const workflows = await this.workflowsService.findByProject(projectId, organizationId);
    const defaultWorkflow = workflows.find((w) => w.isDefault) ?? workflows[0];
    if (!defaultWorkflow) {
      return { created: 0 };
    }
    const statuses = await this.workflowsService.getStatuses(defaultWorkflow.id);
    const todoStatus = statuses.find((s) => s.type === 'TODO') ?? statuses[0];
    const statusId = todoStatus?.id ?? null;

    let created = 0;
    for (const demo of DEMO_TASKS) {
      await this.tasksRepository.create({
        projectId,
        organizationId,
        reporterId,
        title: demo.title,
        description: demo.description,
        statusId,
        priority: 'MEDIUM',
      });
      created++;
    }
    return { created };
  }
}
