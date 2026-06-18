import { BadRequestException, ForbiddenException, HttpException, HttpStatus, Inject, Injectable, NotFoundException, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TasksRepository } from './repositories/tasks.repository';
import { TaskCommentsRepository } from './repositories/task-comments.repository';
import { TaskAttachmentsRepository } from './repositories/task-attachments.repository';
import { ProjectsService } from '../projects/projects.service';
import { WorkflowsService } from '../workflows/workflows.service';
import { UsageService } from '../billing/usage.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { PlanLimitService } from '../../plans/plan-limit.service';
import { TaskEntity } from './entities/task.entity';
import { TaskAttachmentEntity } from './entities/task-attachment.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { PatchTaskDto } from './dto/patch-task.dto';
import { RecurringTasksService } from './recurring-tasks.service';
import { PaginationQueryDto, PaginatedResult, paginate } from '../../common/pagination';
import { formatUuid, generateUuid } from '../../common/utils/uuid.util';
import { Configuration } from '../../config/configuration';
import * as fs from 'fs/promises';
import * as path from 'path';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
function isAllowedMime(mimetype: string): boolean {
  if (!mimetype) return false;
  return (
    mimetype.startsWith('image/') ||
    mimetype.startsWith('text/') ||
    mimetype === 'application/pdf' ||
    mimetype === 'application/json' ||
    mimetype.startsWith('application/zip') ||
    mimetype === 'application/x-zip-compressed'
  );
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200) || 'file';
}

/** Fields assignees may update on tasks assigned to them (owner can update all). */
const ASSIGNEE_PATCH_FIELDS = new Set(['statusId', 'priority', 'subtasks']);

function normalizeAssigneeUserId(id: string | Buffer | null | undefined): string | null {
  const formatted = formatUuid(id as string | Buffer | null | undefined);
  if (!formatted) return null;
  return formatted.trim().toLowerCase().replace(/-/g, '');
}

function taskAssigneeUserIds(task: TaskEntity): string[] {
  const ids = new Set<string>();
  const add = (id: string | Buffer | null | undefined) => {
    const normalized = normalizeAssigneeUserId(id);
    if (normalized) ids.add(normalized);
  };
  for (const id of task.assigneeIds ?? []) add(id);
  add(task.assigneeId);
  return Array.from(ids);
}

function isTaskReporter(task: TaskEntity, userId: string): boolean {
  const normalizedUserId = normalizeAssigneeUserId(userId);
  if (!normalizedUserId) return false;
  return normalizedUserId === normalizeAssigneeUserId(task.reporterId);
}

function patchDtoKeys(dto: PatchTaskDto): string[] {
  return (Object.keys(dto) as (keyof PatchTaskDto)[]).filter((k) => dto[k] !== undefined);
}

@Injectable()
export class TasksService {
  constructor(
    private readonly tasksRepository: TasksRepository,
    private readonly taskCommentsRepository: TaskCommentsRepository,
    private readonly taskAttachmentsRepository: TaskAttachmentsRepository,
    private readonly projectsService: ProjectsService,
    @Inject(forwardRef(() => WorkflowsService))
    private readonly workflowsService: WorkflowsService,
    private readonly usageService: UsageService,
    private readonly activityLogsService: ActivityLogsService,
    private readonly configService: ConfigService<Configuration>,
    private readonly organizationsService: OrganizationsService,
    @Inject(forwardRef(() => PlanLimitService))
    private readonly planLimitService: PlanLimitService,
    @Inject(forwardRef(() => RecurringTasksService))
    private readonly recurringTasksService: RecurringTasksService,
  ) {}

  async findById(id: string): Promise<TaskEntity | null> {
    return this.tasksRepository.findById(id);
  }

  async findByIdInOrganization(id: string, organizationId: string): Promise<TaskEntity | null> {
    return this.tasksRepository.findByIdAndOrganization(id, organizationId);
  }

  async findByProject(
    projectId: string,
    organizationId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<TaskEntity>> {
    const project = await this.projectsService.findByIdInOrganization(projectId, organizationId);
    if (!project) {
      return paginate([], 0, query?.page ?? 1, query?.limit ?? 20);
    }
    const [data, total] = await this.tasksRepository.findByProject(
      projectId,
      query?.page ?? 1,
      query?.limit ?? 20,
    );
    return paginate(data, total, query?.page ?? 1, query?.limit ?? 20);
  }

  async create(
    projectId: string,
    organizationId: string,
    reporterId: string,
    dto: CreateTaskDto,
  ): Promise<TaskEntity> {
    const assigneeIds = dto.assigneeIds?.length
      ? Array.from(new Set(dto.assigneeIds))
      : dto.assigneeId
        ? [dto.assigneeId]
        : [];

    const normalizedSubtasks = this.normalizeSubtasks(dto.subtasks);
    const tags = this.normalizeTags(dto.tags);

    const statusId = await this.resolveInitialStatusId(
      projectId,
      organizationId,
      dto.statusId,
    );

    const task = await this.tasksRepository.create({
      projectId,
      organizationId,
      reporterId,
      title: dto.title,
      description: dto.description ?? null,
      statusId,
      priority: dto.priority ?? 'MEDIUM',
      assigneeId: assigneeIds[0] ?? dto.assigneeId ?? null,
      assigneeIds: assigneeIds.length ? assigneeIds : null,
      dueDate: dto.dueDate ? (String(dto.dueDate).slice(0, 10) as unknown as Date) : null,
      storyPoints: dto.storyPoints ?? null,
      subtasks: normalizedSubtasks.length ? normalizedSubtasks : null,
      parentTaskId: dto.parentTaskId ?? null,
      sprintId: dto.sprintId ?? null,
      tags: tags.length ? tags : null,
    });

    if (dto.recurrence && dto.recurrence.repeat && dto.recurrence.repeat !== 'NONE') {
      await this.recurringTasksService.attachRecurrenceToTask({
        taskId: task.id,
        organizationId,
        reporterId,
        projectId,
        title: dto.title,
        description: dto.description ?? null,
        statusId: statusId ?? null,
        priority: dto.priority ?? 'MEDIUM',
        assigneeId: assigneeIds[0] ?? dto.assigneeId ?? null,
        assigneeIds: assigneeIds.length ? assigneeIds : null,
        storyPoints: dto.storyPoints ?? null,
        subtasks: dto.subtasks,
        tags: tags.length ? tags : null,
        dueDate: dto.dueDate ? String(dto.dueDate).slice(0, 10) : null,
        recurrence: dto.recurrence,
      });
    }
    this.activityLogsService
      .log({ organizationId, userId: reporterId, entityType: 'task', entityId: task.id, action: 'create', metadata: { name: task.title } })
      .catch(() => {});
    return (await this.tasksRepository.findById(task.id)) ?? task;
  }

  async update(
    taskId: string,
    organizationId: string,
    dto: PatchTaskDto,
    userId?: string,
  ): Promise<TaskEntity | null> {
    const task = await this.tasksRepository.findByIdAndOrganization(taskId, organizationId);
    if (!task) return null;

    if (userId) {
      await this.assertCanUpdateTask(task, organizationId, userId, dto);
    }

    const patch: Partial<TaskEntity> = {};
    if (dto.title !== undefined) {
      const trimmedTitle = dto.title.trim();
      if (trimmedTitle.length > 0) {
        patch.title = trimmedTitle;
      }
    }
    if (dto.description !== undefined) {
      const trimmedDescription = dto.description.trim();
      patch.description = trimmedDescription.length > 0 ? trimmedDescription : null;
    }
    if (dto.statusId !== undefined) patch.statusId = dto.statusId ?? null;
    if (dto.sprintId !== undefined) patch.sprintId = dto.sprintId ?? null;
    if (dto.assigneeIds !== undefined) {
      const ids = Array.from(new Set(dto.assigneeIds.filter((id) => !!String(id).trim())));
      patch.assigneeIds = ids.length ? ids : null;
      patch.assigneeId = ids[0] ?? null;
    } else if (dto.assigneeId !== undefined) {
      patch.assigneeId = dto.assigneeId ?? null;
      patch.assigneeIds = patch.assigneeId ? [patch.assigneeId] : null;
    }
    if (dto.dueDate !== undefined) {
      if (dto.dueDate === null || dto.dueDate === '') {
        patch.dueDate = null;
      } else {
        // MySQL `DATE`: use calendar YYYY-MM-DD string. JS `Date` from "YYYY-MM-DD" is UTC midnight and
        // can produce driver/sql errors or off-by-one days vs local date pickers.
        const ymd = String(dto.dueDate).slice(0, 10);
        patch.dueDate = ymd as unknown as Date;
      }
    }
    if (dto.priority !== undefined) {
      patch.priority = dto.priority;
    }
    if (dto.storyPoints !== undefined) patch.storyPoints = dto.storyPoints ?? null;
    if (dto.tags !== undefined) {
      const normalized = this.normalizeTags(dto.tags);
      patch.tags = normalized.length ? normalized : null;
    }
    if (dto.subtasks !== undefined) {
      const normalized = this.normalizeSubtasks(dto.subtasks);
      patch.subtasks = normalized.length ? normalized : null;
    }
    const nextStatusId = dto.statusId !== undefined ? dto.statusId ?? null : task.statusId;
    const statusChanged = dto.statusId !== undefined && nextStatusId !== task.statusId;
    if (statusChanged) {
      const movingToDone = await this.isDoneStatus(task.projectId, organizationId, nextStatusId);
      if (movingToDone) {
        const effectiveSubtasks = patch.subtasks ?? task.subtasks ?? [];
        const hasIncompleteSubtask = effectiveSubtasks.some((subtask) => {
          const status = String(subtask?.status ?? '').toUpperCase();
          if (status) return status !== 'DONE';
          return !Boolean(subtask?.completed);
        });
        if (hasIncompleteSubtask) {
          throw new BadRequestException(
            'Complete all subtasks before moving this task to Done',
          );
        }
      }
    }
    if (Object.keys(patch).length > 0) {
      await this.tasksRepository.update(taskId, patch);
      const action = dto.statusId !== undefined ? 'move' : 'update';
      this.activityLogsService
        .log({ organizationId, userId: userId ?? undefined, entityType: 'task', entityId: taskId, action, metadata: { name: task.title } })
        .catch(() => {});
    }

    if (dto.recurrence) {
      await this.recurringTasksService.updateRecurrenceFromTask(taskId, organizationId, dto.recurrence);
    }

    if (task.recurringTemplateId && statusChanged) {
      const done = await this.isDoneStatus(task.projectId, organizationId, nextStatusId);
      await this.recurringTasksService.syncOccurrenceCompletionFromTaskStatus(taskId, done);
    }
    return this.tasksRepository.findById(taskId);
  }

  private async isDoneStatus(
    projectId: string,
    organizationId: string,
    statusId: string | null | undefined,
  ): Promise<boolean> {
    if (!statusId) return false;
    const workflows = await this.workflowsService.findByProject(projectId, organizationId);
    for (const workflow of workflows) {
      const statuses = await this.workflowsService.getStatuses(workflow.id);
      const status = statuses.find((s: { id: string; type?: string }) => s.id === statusId);
      if (status) return (status.type ?? '').toUpperCase() === 'DONE';
    }
    return false;
  }

  async delete(taskId: string, organizationId: string, userId?: string): Promise<void> {
    const task = await this.tasksRepository.findByIdAndOrganization(taskId, organizationId);
    if (!task) throw new NotFoundException('Task not found');

    if (userId) {
      await this.assertCanDeleteTask(task, organizationId, userId);
    }

    const attachments = await this.taskAttachmentsRepository.findByTask(taskId);
    const uploadsPath = this.configService.get('uploadsPath', { infer: true })!;
    for (const attachment of attachments) {
      const fullPath = path.join(uploadsPath, attachment.fileUrl);
      await fs.unlink(fullPath).catch(() => {});
    }

    await this.tasksRepository.clearParentReferences(taskId);
    await this.tasksRepository.delete(taskId);

    this.activityLogsService
      .log({
        organizationId,
        userId,
        entityType: 'task',
        entityId: taskId,
        action: 'delete',
        metadata: { name: task.title },
      })
      .catch(() => {});
  }

  private async assertCanDeleteTask(
    task: TaskEntity,
    organizationId: string,
    userId: string,
  ): Promise<void> {
    const membership = await this.organizationsService.getMembership(organizationId, userId);
    const role = membership?.role?.toLowerCase() ?? '';
    if (role === 'owner') return;

    if (isTaskReporter(task, userId)) return;

    throw new ForbiddenException('Only the workspace owner or task creator can delete this task');
  }

  private async assertCanUpdateTask(
    task: TaskEntity,
    organizationId: string,
    userId: string,
    dto: PatchTaskDto,
  ): Promise<void> {
    const membership = await this.organizationsService.getMembership(organizationId, userId);
    const role = membership?.role?.toLowerCase() ?? '';
    // Workspace owner or admin can fully update any task fields.
    if (role === 'owner' || role === 'admin') return;

    const assigneeIds = taskAssigneeUserIds(task);
    const normalizedUserId = normalizeAssigneeUserId(userId);
    const isAssignee = normalizedUserId != null && assigneeIds.includes(normalizedUserId);
    const isReporter = isTaskReporter(task, userId);

    // Assigned-by user who is also assigned gets full edit access.
    if (isReporter && isAssignee) return;

    if (!isAssignee) {
      throw new ForbiddenException(
        'Only the workspace owner, task assignee, or assigned-by user (when also assigned) can update this task',
      );
    }

    const keys = patchDtoKeys(dto);
    const disallowed = keys.filter((k) => !ASSIGNEE_PATCH_FIELDS.has(k));
    if (disallowed.length > 0) {
      throw new ForbiddenException(
        'Assignees can only update task status, priority, and subtasks',
      );
    }
  }

  private normalizeTags(
    tags?: Array<{ name: string; color: string }>,
  ): Array<{ name: string; color: string }> {
    if (!tags?.length) return [];
    const seen = new Set<string>();
    return tags
      .filter((t) => t?.name != null && String(t.name).trim().length > 0)
      .map((t) => ({
        name: String(t.name).trim().slice(0, 80),
        color: String(t.color ?? '#6B7280').trim().slice(0, 20),
      }))
      .filter((t) => {
        const key = t.name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  private normalizeSubtaskStatus(subtask: {
    status?: string;
    completed?: boolean;
  }): 'TODO' | 'IN_PROGRESS' | 'DONE' {
    const raw = typeof subtask.status === 'string' ? subtask.status.toUpperCase() : '';
    if (raw === 'TODO' || raw === 'IN_PROGRESS' || raw === 'DONE') {
      return raw;
    }
    if (subtask.completed) return 'DONE';
    return 'TODO';
  }

  private normalizeSubtasks(
    subtasks?: Array<{
      id?: string;
      title: string;
      completed?: boolean;
      description?: string;
      assigneeId?: string;
      dueDate?: string;
      priority?: string;
      status?: string;
      statusId?: string;
    }>,
  ): Array<{
    id: string;
    title: string;
    completed: boolean;
    description?: string;
    assigneeId?: string;
    dueDate?: string;
    status: 'TODO' | 'IN_PROGRESS' | 'DONE';
    priority?: string;
    statusId?: string;
  }> {
    if (!subtasks?.length) return [];
    return subtasks
      .map((s) => {
        const description = s.description?.trim();
        const status = this.normalizeSubtaskStatus(s);
        return {
          id: s.id ?? generateUuid(),
          title: s.title?.trim() ?? '',
          completed: status === 'DONE',
          status,
          ...(description ? { description } : {}),
          assigneeId: s.assigneeId || undefined,
          dueDate: s.dueDate ? String(s.dueDate).slice(0, 10) : undefined,
          ...(s.priority ? { priority: s.priority } : {}),
          ...(s.statusId ? { statusId: s.statusId } : {}),
        };
      })
      .filter((s) => s.title.length > 0);
  }

  async getComments(taskId: string) {
    return this.taskCommentsRepository.findByTask(taskId);
  }

  async addComment(
    taskId: string,
    organizationId: string,
    userId: string,
    body: string,
  ) {
    const task = await this.tasksRepository.findByIdAndOrganization(taskId, organizationId);
    if (!task) throw new NotFoundException('Task not found');
    const trimmed = body.trim();
    if (!trimmed.length) throw new BadRequestException('Comment cannot be empty');
    const comment = await this.taskCommentsRepository.create({
      taskId,
      userId,
      comment: trimmed,
    });
    return this.taskCommentsRepository.findById(comment.id);
  }

  async deleteComment(
    taskId: string,
    commentId: string,
    organizationId: string,
  ): Promise<void> {
    const task = await this.tasksRepository.findByIdAndOrganization(taskId, organizationId);
    if (!task) throw new NotFoundException('Task not found');
    const comment = await this.taskCommentsRepository.findById(commentId);
    if (!comment || comment.taskId !== taskId) throw new NotFoundException('Comment not found');
    await this.taskCommentsRepository.delete(commentId);
  }

  async getAttachments(taskId: string): Promise<TaskAttachmentEntity[]> {
    return this.taskAttachmentsRepository.findByTask(taskId);
  }

  async addAttachment(
    taskId: string,
    organizationId: string,
    userId: string,
    file: { originalname?: string; mimetype?: string; size: number; buffer: Buffer },
  ): Promise<TaskAttachmentEntity> {
    const task = await this.tasksRepository.findByIdAndOrganization(taskId, organizationId);
    if (!task) throw new NotFoundException('Task not found');
    if (file.size > MAX_FILE_SIZE) throw new ForbiddenException('File too large (max 10MB)');
    if (!isAllowedMime(file.mimetype || '')) throw new ForbiddenException('File type not allowed');

    await this.planLimitService.assertStorageLimit(userId, file.size);

    const storageMbIncrement = Math.ceil(file.size / (1024 * 1024));
    const limitCheck = await this.usageService.checkLimit(organizationId, 'storageGb', storageMbIncrement);
    if (!limitCheck.allowed) {
      throw new HttpException(
        {
          statusCode: HttpStatus.FORBIDDEN,
          error: 'LIMIT_EXCEEDED',
          code: 'SUBSCRIPTION_LIMIT_EXCEEDED',
          resource: limitCheck.resource,
          current: limitCheck.current,
          limit: limitCheck.limit,
          message: limitCheck.message,
          upgradeUrl: '/dashboard/billing',
        },
        HttpStatus.FORBIDDEN,
      );
    }
    const uploadsPath = this.configService.get('uploadsPath', { infer: true })!;
    const dir = path.join(uploadsPath, 'task-attachments', taskId);
    await fs.mkdir(dir, { recursive: true });
    const ext = path.extname(file.originalname || '') || '';
    const base = sanitizeFileName(path.basename(file.originalname || 'file', ext));
    const relativePath = path.join('task-attachments', taskId, `${generateUuid()}-${base}${ext}`);
    const fullPath = path.join(uploadsPath, relativePath);
    await fs.writeFile(fullPath, file.buffer);
    const attachment = await this.taskAttachmentsRepository.create({
      taskId,
      fileUrl: relativePath.replace(/\\/g, '/'),
      fileName: file.originalname || null,
      fileSizeBytes: file.size,
      uploadedBy: userId,
    });
    await this.planLimitService.incrementStorageUsed(userId, file.size);
    return attachment;
  }

  async getAttachmentFile(attachmentId: string, organizationId: string): Promise<{ path: string; fileName: string | null }> {
    const attachment = await this.taskAttachmentsRepository.findById(attachmentId);
    if (!attachment) throw new NotFoundException('Attachment not found');
    const task = await this.tasksRepository.findByIdAndOrganization(attachment.taskId, organizationId);
    if (!task) throw new NotFoundException('Task not found');
    const uploadsPath = this.configService.get('uploadsPath', { infer: true })!;
    const fullPath = path.join(uploadsPath, attachment.fileUrl);
    return { path: fullPath, fileName: attachment.fileName };
  }

  async deleteAttachment(
    taskId: string,
    attachmentId: string,
    organizationId: string,
  ): Promise<void> {
    const task = await this.tasksRepository.findByIdAndOrganization(taskId, organizationId);
    if (!task) throw new NotFoundException('Task not found');
    const attachment = await this.taskAttachmentsRepository.findById(attachmentId);
    if (!attachment || attachment.taskId !== taskId) throw new NotFoundException('Attachment not found');
    const uploadsPath = this.configService.get('uploadsPath', { infer: true })!;
    const fullPath = path.join(uploadsPath, attachment.fileUrl);
    await fs.unlink(fullPath).catch(() => {});
    await this.taskAttachmentsRepository.delete(attachmentId);
    if (attachment.fileSizeBytes && attachment.uploadedBy) {
      await this.planLimitService.decrementStorageUsed(
        attachment.uploadedBy,
        Number(attachment.fileSizeBytes),
      );
    }
  }

  /** Pick a valid board column for new tasks (requested status, else first To Do). */
  private async resolveInitialStatusId(
    projectId: string,
    organizationId: string,
    requestedStatusId?: string,
  ): Promise<string | null> {
    const workflows = await this.workflowsService.findByProject(projectId, organizationId);
    const defaultWorkflow = workflows.find((w) => w.isDefault) ?? workflows[0];
    if (!defaultWorkflow) return null;

    const statuses = await this.workflowsService.getStatuses(defaultWorkflow.id);
    if (statuses.length === 0) return null;

    if (requestedStatusId) {
      const match = statuses.find((s) => s.id === requestedStatusId);
      if (match) return match.id;
    }

    const todo =
      statuses.find((s) => s.type === 'TODO') ??
      statuses.find((s) => s.name.toLowerCase() === 'to do') ??
      statuses[0];
    return todo?.id ?? null;
  }
}
