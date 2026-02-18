import { TaskEntity } from '../../tasks/entities/task.entity';
import { CustomFieldEntity } from './custom-field.entity';
export declare class TaskCustomFieldValueEntity {
    id: string;
    taskId: string;
    customFieldId: string;
    value: string | null;
    task?: TaskEntity;
    customField?: CustomFieldEntity;
}
