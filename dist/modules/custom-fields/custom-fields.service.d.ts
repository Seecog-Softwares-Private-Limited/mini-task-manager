import { CustomFieldsRepository } from './repositories/custom-fields.repository';
import { TaskCustomFieldValuesRepository } from './repositories/task-custom-field-values.repository';
import { ProjectsService } from '../projects/projects.service';
import { CustomFieldEntity } from './entities/custom-field.entity';
import { CreateCustomFieldDto } from './dto/create-custom-field.dto';
export declare class CustomFieldsService {
    private readonly customFieldsRepository;
    private readonly taskCustomFieldValuesRepository;
    private readonly projectsService;
    constructor(customFieldsRepository: CustomFieldsRepository, taskCustomFieldValuesRepository: TaskCustomFieldValuesRepository, projectsService: ProjectsService);
    findByProject(projectId: string, organizationId: string): Promise<CustomFieldEntity[]>;
    create(projectId: string, dto: CreateCustomFieldDto): Promise<CustomFieldEntity>;
    getValuesForTask(taskId: string): Promise<import("./entities/task-custom-field-value.entity").TaskCustomFieldValueEntity[]>;
}
