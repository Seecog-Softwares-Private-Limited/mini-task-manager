import { TasksRepository } from './repositories/tasks.repository';
import { TaskCommentsRepository } from './repositories/task-comments.repository';
import { TaskAttachmentsRepository } from './repositories/task-attachments.repository';
import { ProjectsService } from '../projects/projects.service';
import { TaskEntity } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { PaginationQueryDto, PaginatedResult } from '../../common/pagination';
export declare class TasksService {
    private readonly tasksRepository;
    private readonly taskCommentsRepository;
    private readonly taskAttachmentsRepository;
    private readonly projectsService;
    constructor(tasksRepository: TasksRepository, taskCommentsRepository: TaskCommentsRepository, taskAttachmentsRepository: TaskAttachmentsRepository, projectsService: ProjectsService);
    findById(id: string): Promise<TaskEntity | null>;
    findByIdInOrganization(id: string, organizationId: string): Promise<TaskEntity | null>;
    findByProject(projectId: string, organizationId: string, query: PaginationQueryDto): Promise<PaginatedResult<TaskEntity>>;
    create(projectId: string, organizationId: string, reporterId: string, dto: CreateTaskDto): Promise<TaskEntity>;
    getComments(taskId: string): Promise<import("./entities/task-comment.entity").TaskCommentEntity[]>;
    getAttachments(taskId: string): Promise<import("./entities/task-attachment.entity").TaskAttachmentEntity[]>;
}
