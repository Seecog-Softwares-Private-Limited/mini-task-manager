import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  StreamableFile,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SkipThrottle } from '@nestjs/throttler';
import { createReadStream } from 'fs';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUserId } from '../../common/decorators/current-user.decorator';
import { CreateTaskDto } from './dto/create-task.dto';
import { CreateTaskCommentDto } from './dto/create-task-comment.dto';
import { PatchTaskDto } from './dto/patch-task.dto';
import { PaginationQueryDto } from '../../common/pagination';
import { TaskResponseDto } from './dto/task-response.dto';
import { TaskCommentEntity } from './entities/task-comment.entity';

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

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

  @Get('attachments/:attachmentId/file')
  async getAttachmentFile(
    @Param('attachmentId') attachmentId: string,
    @TenantId() tenantId: string,
  ): Promise<StreamableFile> {
    const { path: filePath, fileName } = await this.tasksService.getAttachmentFile(attachmentId, tenantId);
    const stream = createReadStream(filePath);
    return new StreamableFile(stream, {
      disposition: fileName ? `attachment; filename="${fileName}"` : undefined,
    });
  }

  @Get(':id/attachments')
  async getAttachments(
    @Param('id') taskId: string,
    @TenantId() tenantId: string,
  ) {
    const task = await this.tasksService.findByIdInOrganization(taskId, tenantId);
    if (!task) return [];
    return this.tasksService.getAttachments(taskId);
  }

  @Post(':id/attachments')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadAttachment(
    @Param('id') taskId: string,
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @UploadedFile() file: MulterFile | undefined,
  ) {
    if (!file) throw new BadRequestException('File is required');
    return this.tasksService.addAttachment(taskId, tenantId, userId, file);
  }

  @Delete(':id/attachments/:attachmentId')
  async deleteAttachment(
    @Param('id') taskId: string,
    @Param('attachmentId') attachmentId: string,
    @TenantId() tenantId: string,
  ): Promise<{ success: boolean }> {
    await this.tasksService.deleteAttachment(taskId, attachmentId, tenantId);
    return { success: true };
  }

  @Get(':id/comments')
  async getComments(
    @Param('id') taskId: string,
    @TenantId() tenantId: string,
  ) {
    const task = await this.tasksService.findByIdInOrganization(taskId, tenantId);
    if (!task) return [];
    const comments = await this.tasksService.getComments(taskId);
    return comments.map((c) => this.toCommentResponse(c));
  }

  @Post(':id/comments')
  async addComment(
    @Param('id') taskId: string,
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Body() dto: CreateTaskCommentDto,
  ) {
    const comment = await this.tasksService.addComment(taskId, tenantId, userId, dto.body);
    return comment ? this.toCommentResponse(comment) : null;
  }

  @Delete(':id/comments/:commentId')
  async deleteComment(
    @Param('id') taskId: string,
    @Param('commentId') commentId: string,
    @TenantId() tenantId: string,
  ): Promise<{ success: boolean }> {
    await this.tasksService.deleteComment(taskId, commentId, tenantId);
    return { success: true };
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

  @Patch(':id/assignee')
  async updateAssignee(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @Body() body: { assigneeId: string | null },
  ): Promise<TaskResponseDto | null> {
    const task = await this.tasksService.update(id, tenantId, { assigneeId: body.assigneeId ?? null });
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

  private toCommentResponse(c: TaskCommentEntity) {
    return {
      id: c.id,
      taskId: c.taskId,
      userId: c.userId,
      body: c.comment,
      createdAt: c.createdAt,
      updatedAt: c.createdAt,
      user: c.user
        ? {
            id: c.user.id,
            fullName: c.user.fullName,
            email: c.user.email,
            avatarUrl: c.user.avatarUrl ?? undefined,
          }
        : undefined,
    };
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
      tags: t.tags ?? undefined,
      subtasks: t.subtasks ?? undefined,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    };
  }
}
