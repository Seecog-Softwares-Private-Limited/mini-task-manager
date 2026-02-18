import { Injectable } from '@nestjs/common';
import { TasksRepository } from './repositories/tasks.repository';
import { TaskCommentsRepository } from './repositories/task-comments.repository';
import { TaskAttachmentsRepository } from './repositories/task-attachments.repository';
import { ProjectsService } from '../projects/projects.service';
import { TaskEntity } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { PatchTaskDto } from './dto/patch-task.dto';
import { PaginationQueryDto, PaginatedResult, paginate } from '../../common/pagination';
import { generateUuid } from '../../common/utils/uuid.util';

@Injectable()
export class TasksService {
  constructor(
    private readonly tasksRepository: TasksRepository,
    private readonly taskCommentsRepository: TaskCommentsRepository,
    private readonly taskAttachmentsRepository: TaskAttachmentsRepository,
    private readonly projectsService: ProjectsService,
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

    return this.tasksRepository.create({
      projectId,
      organizationId,
      reporterId,
      title: dto.title,
      description: dto.description ?? null,
      statusId: dto.statusId ?? null,
      priority: dto.priority ?? 'MEDIUM',
      assigneeId: assigneeIds[0] ?? dto.assigneeId ?? null,
      assigneeIds: assigneeIds.length ? assigneeIds : null,
      subtasks: normalizedSubtasks.length ? normalizedSubtasks : null,
      parentTaskId: dto.parentTaskId ?? null,
      sprintId: dto.sprintId ?? null,
    });
  }

  async update(
    taskId: string,
    organizationId: string,
    dto: PatchTaskDto,
  ): Promise<TaskEntity | null> {
    const task = await this.tasksRepository.findByIdAndOrganization(taskId, organizationId);
    if (!task) return null;
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
    if (dto.subtasks !== undefined) {
      const normalized = this.normalizeSubtasks(dto.subtasks);
      patch.subtasks = normalized.length ? normalized : null;
    }
    if (Object.keys(patch).length > 0) {
      await this.tasksRepository.update(taskId, patch);
    }
    return this.tasksRepository.findById(taskId);
  }

  private normalizeSubtasks(
    subtasks?: Array<{
      id?: string;
      title: string;
      completed?: boolean;
      assigneeId?: string;
      dueDate?: string;
      priority?: string;
    }>,
  ): Array<{
    id: string;
    title: string;
    completed: boolean;
    assigneeId?: string;
    dueDate?: string;
    priority?: string;
  }> {
    if (!subtasks?.length) return [];
    return subtasks
      .map((s) => ({
        id: s.id ?? generateUuid(),
        title: s.title?.trim() ?? '',
        completed: Boolean(s.completed),
        assigneeId: s.assigneeId || undefined,
        dueDate: s.dueDate || undefined,
        priority: s.priority ?? 'MEDIUM',
      }))
      .filter((s) => s.title.length > 0);
  }

  async getComments(taskId: string) {
    return this.taskCommentsRepository.findByTask(taskId);
  }

  async getAttachments(taskId: string) {
    return this.taskAttachmentsRepository.findByTask(taskId);
  }
}
