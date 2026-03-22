import { Repository } from 'typeorm';
import { TaskEntity } from '../entities/task.entity';
export declare class TasksRepository {
    private readonly repo;
    constructor(repo: Repository<TaskEntity>);
    findById(id: string): Promise<TaskEntity | null>;
    findByIdAndOrganization(id: string, organizationId: string): Promise<TaskEntity | null>;
    findByProject(projectId: string, page: number, limit: number): Promise<[TaskEntity[], number]>;
    countByProject(projectId: string): Promise<number>;
    countByOrganization(organizationId: string): Promise<number>;
    create(data: Partial<TaskEntity>): Promise<TaskEntity>;
    update(id: string, data: Partial<TaskEntity>): Promise<void>;
}
