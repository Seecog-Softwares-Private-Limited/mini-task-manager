import { StreamableFile } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { CreateTaskCommentDto } from './dto/create-task-comment.dto';
import { PatchTaskDto } from './dto/patch-task.dto';
import { PaginationQueryDto } from '../../common/pagination';
import { TaskResponseDto } from './dto/task-response.dto';
interface MulterFile {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
}
export declare class TasksController {
    private readonly tasksService;
    constructor(tasksService: TasksService);
    create(dto: CreateTaskDto, reporterId: string): Promise<TaskResponseDto>;
    findByProject(projectId: string, tenantId: string, query: PaginationQueryDto): Promise<import("../../common/pagination").PaginatedResult<import("./entities/task.entity").TaskEntity>>;
    getAttachmentFile(attachmentId: string, tenantId: string): Promise<StreamableFile>;
    getAttachments(taskId: string, tenantId: string): Promise<import("./entities/task-attachment.entity").TaskAttachmentEntity[]>;
    uploadAttachment(taskId: string, tenantId: string, userId: string, file: MulterFile | undefined): Promise<import("./entities/task-attachment.entity").TaskAttachmentEntity>;
    deleteAttachment(taskId: string, attachmentId: string, tenantId: string): Promise<{
        success: boolean;
    }>;
    getComments(taskId: string, tenantId: string): Promise<{
        id: string;
        taskId: string;
        userId: string;
        body: string;
        createdAt: Date;
        updatedAt: Date;
        user: {
            id: string;
            fullName: string;
            email: string;
            avatarUrl: string | undefined;
        } | undefined;
    }[]>;
    addComment(taskId: string, tenantId: string, userId: string, dto: CreateTaskCommentDto): Promise<{
        id: string;
        taskId: string;
        userId: string;
        body: string;
        createdAt: Date;
        updatedAt: Date;
        user: {
            id: string;
            fullName: string;
            email: string;
            avatarUrl: string | undefined;
        } | undefined;
    } | null>;
    deleteComment(taskId: string, commentId: string, tenantId: string): Promise<{
        success: boolean;
    }>;
    findOne(id: string, tenantId?: string): Promise<TaskResponseDto | null>;
    updateAssignee(id: string, tenantId: string, body: {
        assigneeId: string | null;
    }): Promise<TaskResponseDto | null>;
    update(id: string, tenantId: string, dto: PatchTaskDto): Promise<TaskResponseDto | null>;
    private toCommentResponse;
    private toResponse;
}
export {};
