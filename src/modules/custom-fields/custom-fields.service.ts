import { Injectable } from '@nestjs/common';
import { CustomFieldsRepository } from './repositories/custom-fields.repository';
import { TaskCustomFieldValuesRepository } from './repositories/task-custom-field-values.repository';
import { ProjectsService } from '../projects/projects.service';
import { CustomFieldEntity } from './entities/custom-field.entity';
import { CreateCustomFieldDto } from './dto/create-custom-field.dto';

@Injectable()
export class CustomFieldsService {
  constructor(
    private readonly customFieldsRepository: CustomFieldsRepository,
    private readonly taskCustomFieldValuesRepository: TaskCustomFieldValuesRepository,
    private readonly projectsService: ProjectsService,
  ) {}

  async findByProject(projectId: string, organizationId: string): Promise<CustomFieldEntity[]> {
    const project = await this.projectsService.findByIdInOrganization(projectId, organizationId);
    if (!project) return [];
    return this.customFieldsRepository.findByProject(projectId);
  }

  async create(projectId: string, dto: CreateCustomFieldDto): Promise<CustomFieldEntity> {
    return this.customFieldsRepository.create({
      projectId,
      name: dto.name,
      fieldType: dto.fieldType,
      isRequired: dto.isRequired ?? false,
    });
  }

  async getValuesForTask(taskId: string) {
    return this.taskCustomFieldValuesRepository.findByTask(taskId);
  }
}
