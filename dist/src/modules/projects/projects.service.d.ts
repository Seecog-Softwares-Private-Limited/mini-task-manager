import { ProjectsRepository } from './repositories/projects.repository';
import { ProjectEntity } from './entities/project.entity';
import { CreateProjectDto } from './dto/create-project.dto';
export declare class ProjectsService {
    private readonly projectsRepository;
    constructor(projectsRepository: ProjectsRepository);
    findById(id: string): Promise<ProjectEntity | null>;
    findByIdInOrganization(id: string, organizationId: string): Promise<ProjectEntity | null>;
    findByOrganization(organizationId: string): Promise<ProjectEntity[]>;
    create(organizationId: string, createdBy: string, dto: CreateProjectDto): Promise<ProjectEntity>;
}
