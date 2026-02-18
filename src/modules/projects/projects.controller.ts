import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Logger } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ProjectsService } from './projects.service';
import { WorkflowsService } from '../workflows/workflows.service';
import { ProjectEntity } from './entities/project.entity';
import { ProjectMemberEntity } from './entities/project-member.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUserId } from '../../common/decorators/current-user.decorator';
import { CreateProjectDto } from './dto/create-project.dto';
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
  ) {}

  @Post()
  async create(
    @Body() dto: CreateProjectDto,
    @TenantId() tenantId?: string,
    @CurrentUserId() createdBy?: string,
  ): Promise<ProjectResponseDto> {
    const project = await this.projectsService.create(tenantId!, createdBy!, dto);

    // Auto-create default workflow (To Do / In Progress / Done)
    try {
      await this.workflowsService.createDefaultWorkflow(project.id);
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

  // ── Project Members (must come before :id catch-all) ──

  @Get(':id/members')
  async getMembers(@Param('id') projectId: string) {
    const members = await this.projectsService.getProjectMembers(projectId);
    return members.map((m) => this.toMemberResponse(m));
  }

  @Post(':id/members')
  async addMember(
    @Param('id') projectId: string,
    @Body() dto: AddProjectMemberDto,
  ) {
    const member = await this.projectsService.addProjectMember(projectId, dto.userId, dto.role);
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

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @TenantId() tenantId?: string,
  ): Promise<ProjectResponseDto | null> {
    const project = await this.projectsService.findByIdInOrganization(id, tenantId!);
    if (!project) return null;
    return this.toResponse(project);
  }

  private toResponse(p: ProjectEntity): ProjectResponseDto {
    return {
      id: p.id,
      organizationId: p.organizationId,
      name: p.name,
      description: p.description ?? undefined,
      visibility: p.visibility,
      isArchived: p.isArchived,
      createdBy: p.createdBy,
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
