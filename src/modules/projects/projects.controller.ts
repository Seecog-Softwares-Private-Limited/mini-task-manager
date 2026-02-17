import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ProjectsService } from './projects.service';
import { ProjectEntity } from './entities/project.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUserId } from '../../common/decorators/current-user.decorator';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectResponseDto } from './dto/project-response.dto';

@Controller('projects')
@SkipThrottle({ auth: true })
@UseGuards(JwtAuthGuard, TenantGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  async create(
    @Body() dto: CreateProjectDto,
    @TenantId() tenantId?: string,
    @CurrentUserId() createdBy?: string,
  ): Promise<ProjectResponseDto> {
    const project = await this.projectsService.create(tenantId!, createdBy!, dto);
    return this.toResponse(project);
  }

  @Get()
  async findAll(@TenantId() tenantId?: string): Promise<ProjectResponseDto[]> {
    const list = await this.projectsService.findByOrganization(tenantId!);
    return list.map((p) => this.toResponse(p));
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
}
