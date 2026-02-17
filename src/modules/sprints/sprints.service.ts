import { Injectable } from '@nestjs/common';
import { SprintsRepository } from './repositories/sprints.repository';
import { ProjectsService } from '../projects/projects.service';
import { SprintEntity } from './entities/sprint.entity';
import { CreateSprintDto } from './dto/create-sprint.dto';

@Injectable()
export class SprintsService {
  constructor(
    private readonly sprintsRepository: SprintsRepository,
    private readonly projectsService: ProjectsService,
  ) {}

  async findById(id: string): Promise<SprintEntity | null> {
    return this.sprintsRepository.findById(id);
  }

  async findByIdInOrganization(id: string, organizationId: string): Promise<SprintEntity | null> {
    const sprint = await this.sprintsRepository.findById(id);
    if (!sprint) return null;
    const project = await this.projectsService.findByIdInOrganization(sprint.projectId, organizationId);
    if (!project) return null;
    return sprint;
  }

  async findByProject(projectId: string, organizationId: string): Promise<SprintEntity[]> {
    const project = await this.projectsService.findByIdInOrganization(projectId, organizationId);
    if (!project) return [];
    return this.sprintsRepository.findByProject(projectId);
  }

  async create(projectId: string, dto: CreateSprintDto): Promise<SprintEntity> {
    return this.sprintsRepository.create({
      projectId,
      name: dto.name,
      startDate: dto.startDate ? new Date(dto.startDate) : null,
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      status: dto.status ?? 'PLANNED',
    });
  }
}
