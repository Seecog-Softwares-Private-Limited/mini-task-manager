import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUserId } from '../../common/decorators/current-user.decorator';
import { CreateTaskDto } from './dto/create-task.dto';
import { PatchTaskDto } from './dto/patch-task.dto';
import { PaginationQueryDto } from '../../common/pagination';
import { TaskResponseDto } from './dto/task-response.dto';

@Controller('tasks')
@SkipThrottle({ auth: true })
@UseGuards(JwtAuthGuard, TenantGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  async create(
    @Body() dto: CreateTaskDto,
    @CurrentUserId() reporterId: string,
  ): Promise<TaskResponseDto> {
    const projectId = dto.projectId!;
    const organizationId = dto.organizationId!;
    const task = await this.tasksService.create(projectId, organizationId, reporterId, dto);
    return this.toResponse(task);
  }

  @Get('project/:projectId')
  async findByProject(
    @Param('projectId') projectId: string,
    @TenantId() tenantId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.tasksService.findByProject(projectId, tenantId, query);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @TenantId() tenantId?: string,
  ): Promise<TaskResponseDto | null> {
    const task = await this.tasksService.findByIdInOrganization(id, tenantId!);
    if (!task) return null;
    return this.toResponse(task);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @Body() dto: PatchTaskDto,
  ): Promise<TaskResponseDto | null> {
    const task = await this.tasksService.update(id, tenantId, dto);
    if (!task) return null;
    return this.toResponse(task);
  }

  private toResponse(t: import('./entities/task.entity').TaskEntity): TaskResponseDto {
    return {
      id: t.id,
      projectId: t.projectId,
      organizationId: t.organizationId,
      title: t.title,
      description: t.description ?? undefined,
      statusId: t.statusId ?? undefined,
      priority: t.priority,
      assigneeId: t.assigneeId ?? undefined,
      assigneeIds: t.assigneeIds ?? (t.assigneeId ? [t.assigneeId] : undefined),
      reporterId: t.reporterId,
      parentTaskId: t.parentTaskId ?? undefined,
      storyPoints: t.storyPoints ?? undefined,
      dueDate: t.dueDate ?? undefined,
      estimatedMinutes: t.estimatedMinutes ?? undefined,
      loggedMinutes: t.loggedMinutes,
      sprintId: t.sprintId ?? undefined,
      subtasks: t.subtasks ?? undefined,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    };
  }
}
