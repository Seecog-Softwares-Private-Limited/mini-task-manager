import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { SprintsService } from './sprints.service';
import { SprintEntity } from './entities/sprint.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { SprintResponseDto } from './dto/sprint-response.dto';

@Controller('sprints')
@SkipThrottle({ auth: true })
@UseGuards(JwtAuthGuard, TenantGuard)
export class SprintsController {
  constructor(private readonly sprintsService: SprintsService) {}

  @Post()
  async create(@Body() dto: CreateSprintDto): Promise<SprintResponseDto> {
    const projectId = dto.projectId!;
    const sprint = await this.sprintsService.create(projectId, dto);
    return this.toResponse(sprint);
  }

  @Get('project/:projectId')
  async findByProject(
    @Param('projectId') projectId: string,
    @TenantId() tenantId: string,
  ): Promise<SprintResponseDto[]> {
    const list = await this.sprintsService.findByProject(projectId, tenantId);
    return list.map((s) => this.toResponse(s));
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @TenantId() tenantId?: string,
  ): Promise<SprintResponseDto | null> {
    const sprint = await this.sprintsService.findByIdInOrganization(id, tenantId!);
    if (!sprint) return null;
    return this.toResponse(sprint);
  }

  private toResponse(s: SprintEntity): SprintResponseDto {
    return {
      id: s.id,
      projectId: s.projectId,
      name: s.name,
      startDate: s.startDate ?? undefined,
      endDate: s.endDate ?? undefined,
      status: s.status,
      createdAt: s.createdAt,
    };
  }
}
