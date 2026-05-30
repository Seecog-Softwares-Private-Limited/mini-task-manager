import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Logger } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ProjectsService } from './projects.service';
import { WorkflowsService } from '../workflows/workflows.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ProjectEntity } from './entities/project.entity';
import { ProjectMemberEntity } from './entities/project-member.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { SubscriptionGuard } from '../billing/guards/subscription.guard';
import { CheckSubscriptionLimit } from '../billing/decorators/check-limit.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUserId } from '../../common/decorators/current-user.decorator';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddProjectMemberDto } from './dto/add-project-member.dto';
import { UpdateProjectMemberRoleDto } from './dto/update-project-member-role.dto';
import { ProjectResponseDto } from './dto/project-response.dto';

@Controller('projects')
@SkipThrottle({ auth: true })
@UseGuards(JwtAuthGuard, TenantGuard)
export class ProjectsController {
  private readonly logger = new Logger(ProjectsController.name);

  constructor(
    private readonly projectsService: ProjectsService,
    private readonly workflowsService: WorkflowsService,
    private readonly organizationsService: OrganizationsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Post()
  @UseGuards(SubscriptionGuard)
  @CheckSubscriptionLimit('projects')
  async create(
    @Body() dto: CreateProjectDto,
    @TenantId() tenantId?: string,
    @CurrentUserId() createdBy?: string,
  ): Promise<ProjectResponseDto> {
    const project = await this.projectsService.create(tenantId!, createdBy!, dto);

    // Auto-create default workflow (To Do / In Progress / Done)
    try {
      await this.workflowsService.createDefaultWorkflow(project.id, tenantId!);
    } catch (err) {
      this.logger.warn(`Failed to auto-create default workflow for project ${project.id}: ${err}`);
    }

    return this.toResponse(project);
  }

  @Get()
  async findAll(@TenantId() tenantId?: string): Promise<ProjectResponseDto[]> {
    const list = await this.projectsService.findByOrganization(tenantId!);
    return list.map((p) => this.toResponse(p));
  }

  @Get('count')
  async getCount(@TenantId() tenantId?: string): Promise<{ count: number }> {
    const count = await this.projectsService.countByOrganization(tenantId!);
    return { count };
  }

  @Get('templates')
  async getTemplates(): Promise<{ id: string; name: string; description: string }[]> {
    return [
      { id: 'blank', name: 'Blank', description: 'Start with an empty project' },
      { id: 'kanban', name: 'Kanban', description: 'To Do, In Progress, Done workflow' },
      { id: 'product', name: 'Product Development', description: 'Ideas, Backlog, In Progress, Review, Done' },
    ];
  }

  // ── Project Members (must come before :id catch-all) ──

  @Get(':id/members')
  async getMembers(
    @Param('id') projectId: string,
    @TenantId() tenantId?: string,
  ) {
    const byUserId = new Map<string, ReturnType<ProjectsController['toMemberResponse']>>();

    for (const m of await this.projectsService.getProjectMembers(projectId)) {
      byUserId.set(m.userId, this.toMemberResponse(m));
    }

    if (tenantId) {
      const orgMembers = await this.organizationsService.getMembers(tenantId);
      for (const om of orgMembers) {
        if (om.status !== 'ACTIVE') continue;
        if (byUserId.has(om.userId)) continue;
        byUserId.set(om.userId, {
          id: om.id,
          projectId,
          userId: om.userId,
          role: om.role,
          user: om.user
            ? {
                id: om.user.id,
                fullName: om.user.fullName,
                email: om.user.email,
                avatarUrl: om.user.avatarUrl ?? undefined,
              }
            : undefined,
        });
      }
    }

    return Array.from(byUserId.values());
  }

  @Post(':id/members')
  async addMember(
    @Param('id') projectId: string,
    @Body() dto: AddProjectMemberDto,
    @CurrentUserId() addedByUserId: string,
  ) {
    const member = await this.projectsService.addProjectMember(projectId, dto.userId, dto.role);
    const project = await this.projectsService.findById(projectId);
    if (project && dto.userId !== addedByUserId) {
      this.notificationsService
        .createNotification(
          dto.userId,
          'Added to project',
          `You were added to "${project.name}".`,
        )
        .catch((err) => this.logger.warn(`Notification failed: ${err}`));
    }
    return this.toMemberResponse(member);
  }

  @Patch(':id/members/:memberId')
  async updateMemberRole(
    @Param('memberId') memberId: string,
    @Body() dto: UpdateProjectMemberRoleDto,
  ) {
    const member = await this.projectsService.updateProjectMemberRole(memberId, dto.role);
    return this.toMemberResponse(member);
  }

  @Delete(':id/members/:memberId')
  async removeMember(@Param('memberId') memberId: string) {
    await this.projectsService.removeProjectMember(memberId);
    return { success: true };
  }

  @Post(':id/seed-demo-tasks')
  async seedDemoTasks(
    @Param('id') projectId: string,
    @TenantId() tenantId?: string,
    @CurrentUserId() userId?: string,
  ) {
    return this.projectsService.seedDemoTasks(projectId, tenantId!, userId!);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @TenantId() tenantId?: string,
  ): Promise<ProjectResponseDto | null> {
    const project = await this.projectsService.findByIdInOrganization(id, tenantId!);
    if (!project) return null;
    return this.toResponse(project);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @TenantId() tenantId?: string,
    @CurrentUserId() userId?: string,
  ): Promise<ProjectResponseDto> {
    const project = await this.projectsService.update(id, tenantId!, dto, userId);
    return this.toResponse(project);
  }

  private toResponse(p: ProjectEntity): ProjectResponseDto {
    const entity = p as ProjectEntity & { createdAt?: Date; updatedAt?: Date };
    return {
      id: p.id,
      organizationId: p.organizationId,
      name: p.name,
      description: p.description ?? undefined,
      iconUrl: p.iconUrl ?? undefined,
      visibility: p.visibility,
      isArchived: p.isArchived,
      createdBy: p.createdBy,
      createdAt: entity.createdAt?.toISOString?.() ?? new Date().toISOString(),
      updatedAt: entity.updatedAt?.toISOString?.() ?? new Date().toISOString(),
    };
  }

  private toMemberResponse(m: ProjectMemberEntity) {
    return {
      id: m.id,
      projectId: m.projectId,
      userId: m.userId,
      role: m.role,
      user: m.user
        ? {
            id: m.user.id,
            fullName: m.user.fullName,
            email: m.user.email,
            avatarUrl: m.user.avatarUrl ?? undefined,
          }
        : undefined,
    };
  }
}
