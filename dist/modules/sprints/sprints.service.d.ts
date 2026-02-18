import { SprintsRepository } from './repositories/sprints.repository';
import { ProjectsService } from '../projects/projects.service';
import { SprintEntity } from './entities/sprint.entity';
import { CreateSprintDto } from './dto/create-sprint.dto';
export declare class SprintsService {
    private readonly sprintsRepository;
    private readonly projectsService;
    constructor(sprintsRepository: SprintsRepository, projectsService: ProjectsService);
    findById(id: string): Promise<SprintEntity | null>;
    findByIdInOrganization(id: string, organizationId: string): Promise<SprintEntity | null>;
    findByProject(projectId: string, organizationId: string): Promise<SprintEntity[]>;
    create(projectId: string, dto: CreateSprintDto): Promise<SprintEntity>;
}
