import { SprintsService } from './sprints.service';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { SprintResponseDto } from './dto/sprint-response.dto';
export declare class SprintsController {
    private readonly sprintsService;
    constructor(sprintsService: SprintsService);
    create(dto: CreateSprintDto): Promise<SprintResponseDto>;
    findByProject(projectId: string, tenantId: string): Promise<SprintResponseDto[]>;
    findOne(id: string, tenantId?: string): Promise<SprintResponseDto | null>;
    private toResponse;
}
