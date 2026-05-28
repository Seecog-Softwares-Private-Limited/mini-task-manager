import { ConfigService } from '@nestjs/config';
import { TasksRepository } from './repositories/tasks.repository';
import { TaskCommentsRepository } from './repositories/task-comments.repository';
import { TaskAttachmentsRepository } from './repositories/task-attachments.repository';
import { ProjectsService } from '../projects/projects.service';
import { WorkflowsService } from '../workflows/workflows.service';
import { UsageService } from '../billing/usage.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { TaskEntity } from './entities/task.entity';
import { TaskAttachmentEntity } from './entities/task-attachment.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { PatchTaskDto } from './dto/patch-task.dto';
import { PaginationQueryDto, PaginatedResult } from '../../common/pagination';
import { Configuration } from '../../config/configuration';
export declare class TasksService {
    private readonly tasksRepository;
    private readonly taskCommentsRepository;
    private readonly taskAttachmentsRepository;
    private readonly projectsService;
    private readonly workflowsService;
    private readonly usageService;
    private readonly activityLogsService;
    private readonly configService;
    constructor(tasksRepository: TasksRepository, taskCommentsRepository: TaskCommentsRepository, taskAttachmentsRepository: TaskAttachmentsRepository, projectsService: ProjectsService, workflowsService: WorkflowsService, usageService: UsageService, activityLogsService: ActivityLogsService, configService: ConfigService<Configuration>);
    findById(id: string): Promise<TaskEntity | null>;
    findByIdInOrganization(id: string, organizationId: string): Promise<TaskEntity | null>;
    findByProject(projectId: string, organizationId: string, query: PaginationQueryDto): Promise<PaginatedResult<TaskEntity>>;
    create(projectId: string, organizationId: string, reporterId: string, dto: CreateTaskDto): Promise<TaskEntity>;
    update(taskId: string, organizationId: string, dto: PatchTaskDto, userId?: string): Promise<TaskEntity | null>;
    private normalizeTags;
    private normalizeSubtasks;
    getComments(taskId: string): Promise<import("./entities/task-comment.entity").TaskCommentEntity[]>;
    addComment(taskId: string, organizationId: string, userId: string, body: string): Promise<import("./entities/task-comment.entity").TaskCommentEntity | null>;
    deleteComment(taskId: string, commentId: string, organizationId: string): Promise<void>;
    getAttachments(taskId: string): Promise<TaskAttachmentEntity[]>;
    addAttachment(taskId: string, organizationId: string, userId: string, file: {
        originalname?: string;
        mimetype?: string;
        size: number;
        buffer: Buffer;
    }): Promise<TaskAttachmentEntity>;
    getAttachmentFile(attachmentId: string, organizationId: string): Promise<{
        path: string;
        fileName: string | null;
    }>;
    deleteAttachment(taskId: string, attachmentId: string, organizationId: string): Promise<void>;
    private resolveInitialStatusId;
}
