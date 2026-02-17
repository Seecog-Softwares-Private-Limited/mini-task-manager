import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectResponseDto } from './dto/project-response.dto';
export declare class ProjectsController {
    private readonly projectsService;
    constructor(projectsService: ProjectsService);
    create(dto: CreateProjectDto, tenantId?: string, createdBy?: string): Promise<ProjectResponseDto>;
    findAll(tenantId?: string): Promise<ProjectResponseDto[]>;
    findOne(id: string, tenantId?: string): Promise<ProjectResponseDto | null>;
    private toResponse;
}
