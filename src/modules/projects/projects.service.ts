import {
  ConflictException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ProjectsRepository } from './repositories/projects.repository';
import { uuidBinaryTransformer } from '../../common/base.entity';
import { Configuration } from '../../config/configuration';
import { ProjectMembersRepository } from './repositories/project-members.repository';
import { ProjectEntity } from './entities/project.entity';
import { ProjectMemberEntity } from './entities/project-member.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { TasksRepository } from '../tasks/repositories/tasks.repository';
import { WorkflowsService } from '../workflows/workflows.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { OrganizationsService } from '../organizations/organizations.service';

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
    @Inject(forwardRef(() => OrganizationsService))
    private readonly organizationsService: OrganizationsService,
    private readonly activityLogsService: ActivityLogsService,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService<Configuration>,
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

  /**
   * Owner sees every workspace project (to manage access).
   * Admins and members only see projects they were explicitly granted.
   */
  async findVisibleForUser(
    organizationId: string,
    userId: string,
    orgRole?: string | null,
  ): Promise<ProjectEntity[]> {
    const all = await this.projectsRepository.findByOrganization(organizationId);
    const role = (orgRole ?? '').toLowerCase();
    if (role === 'owner') {
      return all;
    }
    const allowedIds = new Set(
      await this.projectMembersRepository.findProjectIdsByUser(userId),
    );
    return all.filter((p) => allowedIds.has(p.id));
  }

  /** Whether the user may open this project (owner bypasses membership). */
  async userCanAccessProject(
    organizationId: string,
    projectId: string,
    userId: string,
    orgRole?: string | null,
  ): Promise<boolean> {
    const project = await this.projectsRepository.findByIdAndOrganization(
      projectId,
      organizationId,
    );
    if (!project) return false;
    const role = (orgRole ?? '').toLowerCase();
    if (role === 'owner') return true;
    const membership = await this.projectMembersRepository.findByProjectAndUser(
      projectId,
      userId,
    );
    return !!membership;
  }

  async assertUserCanAccessProject(
    organizationId: string,
    projectId: string,
    userId: string,
    orgRole?: string | null,
  ): Promise<void> {
    const ok = await this.userCanAccessProject(organizationId, projectId, userId, orgRole);
    if (!ok) {
      throw new ForbiddenException('You do not have access to this project');
    }
  }

  /** Project IDs in this org that the user currently has access to. */
  async getUserProjectIdsInOrganization(
    organizationId: string,
    userId: string,
  ): Promise<string[]> {
    const all = await this.projectsRepository.findByOrganization(organizationId);
    const orgProjectIds = new Set(all.map((p) => p.id));
    const userProjectIds = await this.projectMembersRepository.findProjectIdsByUser(userId);
    return userProjectIds.filter((id) => orgProjectIds.has(id));
  }

  /**
   * Owner-managed sync: set exactly which org projects a member can see.
   * Adds CONTRIBUTOR for new grants; removes memberships for deselected projects.
   */
  async setUserProjectAccess(
    organizationId: string,
    targetUserId: string,
    projectIds: string[],
  ): Promise<{ projectIds: string[] }> {
    const membership = await this.organizationsService.getMembership(
      organizationId,
      targetUserId,
    );
    if (!membership || membership.status?.toUpperCase() !== 'ACTIVE') {
      throw new NotFoundException('Workspace member not found');
    }

    const orgProjects = await this.projectsRepository.findByOrganization(organizationId);
    const orgProjectIds = new Set(orgProjects.map((p) => p.id));
    const desired = [
      ...new Set(
        (projectIds ?? [])
          .map((id) => String(id ?? '').trim())
          .filter((id) => orgProjectIds.has(id)),
      ),
    ];
    const desiredSet = new Set(desired);

    const current = await this.getUserProjectIdsInOrganization(organizationId, targetUserId);
    const currentSet = new Set(current);

    for (const projectId of desired) {
      if (currentSet.has(projectId)) continue;
      const existing = await this.projectMembersRepository.findByProjectAndUser(
        projectId,
        targetUserId,
      );
      if (!existing) {
        await this.projectMembersRepository.create({
          projectId,
          userId: targetUserId,
          role: 'CONTRIBUTOR',
        });
      }
    }

    for (const projectId of current) {
      if (desiredSet.has(projectId)) continue;
      const row = await this.projectMembersRepository.findByProjectAndUser(
        projectId,
        targetUserId,
      );
      if (row) {
        await this.projectMembersRepository.delete(row.id);
      }
    }

    return {
      projectIds: await this.getUserProjectIdsInOrganization(organizationId, targetUserId),
    };
  }

  async countByOrganization(organizationId: string): Promise<number> {
    return this.projectsRepository.countByOrganization(organizationId);
  }

  async create(organizationId: string, createdBy: string, dto: CreateProjectDto): Promise<ProjectEntity> {
    const iconTrimmed = dto.iconUrl?.trim();
    const siteIdTrimmed = dto.siteId?.trim();
    const project = await this.projectsRepository.create({
      organizationId,
      createdBy,
      siteId: siteIdTrimmed && siteIdTrimmed.length > 0 ? siteIdTrimmed : null,
      name: dto.name,
      description: dto.description ?? null,
      iconUrl: iconTrimmed && iconTrimmed.length > 0 ? dto.iconUrl! : null,
      visibility: dto.visibility ?? 'PRIVATE',
    });
    // Creator always has project access (members otherwise only see invited projects).
    const existing = await this.projectMembersRepository.findByProjectAndUser(
      project.id,
      createdBy,
    );
    if (!existing) {
      await this.projectMembersRepository.create({
        projectId: project.id,
        userId: createdBy,
        role: 'ADMIN',
      });
    }
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
    if (dto.siteId !== undefined) {
      const v = dto.siteId.trim();
      payload.siteId = v.length === 0 ? null : v;
    }
    if (Object.keys(payload).length === 0) return project;
    await this.projectsRepository.update(id, payload);
    const updated = await this.projectsRepository.findByIdAndOrganization(id, organizationId);
    this.activityLogsService
      .log({ organizationId, userId: userId ?? undefined, entityType: 'project', entityId: id, action: 'update', metadata: { name: updated?.name ?? project.name } })
      .catch(() => {});
    return updated!;
  }

  /** Permanently delete a project and all tasks, workflows, and attachments. */
  async deletePermanently(
    id: string,
    organizationId: string,
    userId?: string,
  ): Promise<void> {
    const project = await this.projectsRepository.findByIdAndOrganization(id, organizationId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const projectBin = uuidBinaryTransformer.to(id) as Buffer;
    const uploadsPath = this.configService.get('uploadsPath', { infer: true })!;

    const attachmentRows = (await this.dataSource.query(
      `SELECT ta.file_url AS fileUrl FROM task_attachments ta
       INNER JOIN tasks t ON t.id = ta.task_id
       WHERE t.project_id = ?`,
      [projectBin],
    )) as Array<{ fileUrl: string }>;

    await this.dataSource.transaction(async (manager) => {
      await manager.query(
        `UPDATE tasks SET parent_task_id = NULL, sprint_id = NULL, status_id = NULL WHERE project_id = ?`,
        [projectBin],
      );
      await manager.query(`DELETE FROM projects WHERE id = ?`, [projectBin]);
    });

    for (const row of attachmentRows) {
      if (row.fileUrl) {
        await fs.unlink(path.join(uploadsPath, row.fileUrl)).catch(() => {});
      }
    }
    await fs
      .rm(path.join(uploadsPath, 'task-attachments', id), { recursive: true, force: true })
      .catch(() => {});

    this.activityLogsService
      .log({
        organizationId,
        userId: userId ?? undefined,
        entityType: 'project',
        entityId: id,
        action: 'delete',
        metadata: { name: project.name, permanent: true },
      })
      .catch(() => {});
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
