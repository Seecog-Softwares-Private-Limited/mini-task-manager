import { Injectable } from '@nestjs/common';
import { ProjectsRepository } from './repositories/projects.repository';
import { ProjectEntity } from './entities/project.entity';
import { CreateProjectDto } from './dto/create-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly projectsRepository: ProjectsRepository) {}

  async findById(id: string): Promise<ProjectEntity | null> {
    return this.projectsRepository.findById(id);
  }

  async findByIdInOrganization(id: string, organizationId: string): Promise<ProjectEntity | null> {
    return this.projectsRepository.findByIdAndOrganization(id, organizationId);
  }

  async findByOrganization(organizationId: string): Promise<ProjectEntity[]> {
    return this.projectsRepository.findByOrganization(organizationId);
  }

  async create(organizationId: string, createdBy: string, dto: CreateProjectDto): Promise<ProjectEntity> {
    return this.projectsRepository.create({
      organizationId,
      createdBy,
      name: dto.name,
      description: dto.description ?? null,
      visibility: dto.visibility ?? 'PRIVATE',
    });
  }
}
