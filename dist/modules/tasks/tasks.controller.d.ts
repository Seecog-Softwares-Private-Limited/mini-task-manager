import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { PatchTaskDto } from './dto/patch-task.dto';
import { PaginationQueryDto } from '../../common/pagination';
import { TaskResponseDto } from './dto/task-response.dto';
export declare class TasksController {
    private readonly tasksService;
    constructor(tasksService: TasksService);
    create(dto: CreateTaskDto, reporterId: string): Promise<TaskResponseDto>;
    findByProject(projectId: string, tenantId: string, query: PaginationQueryDto): Promise<import("../../common/pagination").PaginatedResult<import("./entities/task.entity").TaskEntity>>;
    findOne(id: string, tenantId?: string): Promise<TaskResponseDto | null>;
    update(id: string, tenantId: string, dto: PatchTaskDto): Promise<TaskResponseDto | null>;
    private toResponse;
}
