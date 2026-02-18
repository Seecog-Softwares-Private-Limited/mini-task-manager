import { Repository } from 'typeorm';
import { TaskCustomFieldValueEntity } from '../entities/task-custom-field-value.entity';
export declare class TaskCustomFieldValuesRepository {
    private readonly repo;
    constructor(repo: Repository<TaskCustomFieldValueEntity>);
    findByTask(taskId: string): Promise<TaskCustomFieldValueEntity[]>;
    upsert(data: Partial<TaskCustomFieldValueEntity>): Promise<TaskCustomFieldValueEntity>;
}
