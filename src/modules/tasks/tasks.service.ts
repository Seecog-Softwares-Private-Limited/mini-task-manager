import { Injectable } from '@nestjs/common';
import { TasksRepository } from './repositories/tasks.repository';
import { TaskCommentsRepository } from './repositories/task-comments.repository';
import { TaskAttachmentsRepository } from './repositories/task-attachments.repository';
import { ProjectsService } from '../projects/projects.service';
import { TaskEntity } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { PaginationQueryDto, PaginatedResult, paginate } from '../../common/pagination';

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
    return this.tasksRepository.create({
      projectId,
      organizationId,
      reporterId,
      title: dto.title,
      description: dto.description ?? null,
      statusId: dto.statusId ?? null,
      priority: dto.priority ?? 'MEDIUM',
      assigneeId: dto.assigneeId ?? null,
      parentTaskId: dto.parentTaskId ?? null,
      sprintId: dto.sprintId ?? null,
    });
  }

  async getComments(taskId: string) {
    return this.taskCommentsRepository.findByTask(taskId);
  }

  async getAttachments(taskId: string) {
    return this.taskAttachmentsRepository.findByTask(taskId);
  }
}
