import { ProjectsRepository } from './repositories/projects.repository';
import { ProjectMembersRepository } from './repositories/project-members.repository';
import { ProjectEntity } from './entities/project.entity';
import { ProjectMemberEntity } from './entities/project-member.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { TasksRepository } from '../tasks/repositories/tasks.repository';
import { WorkflowsService } from '../workflows/workflows.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
export declare class ProjectsService {
    private readonly projectsRepository;
    private readonly projectMembersRepository;
    private readonly tasksRepository;
    private readonly workflowsService;
    private readonly activityLogsService;
    constructor(projectsRepository: ProjectsRepository, projectMembersRepository: ProjectMembersRepository, tasksRepository: TasksRepository, workflowsService: WorkflowsService, activityLogsService: ActivityLogsService);
    findById(id: string): Promise<ProjectEntity | null>;
    findByIdInOrganization(id: string, organizationId: string): Promise<ProjectEntity | null>;
    findByOrganization(organizationId: string): Promise<ProjectEntity[]>;
    countByOrganization(organizationId: string): Promise<number>;
    create(organizationId: string, createdBy: string, dto: CreateProjectDto): Promise<ProjectEntity>;
    update(id: string, organizationId: string, dto: UpdateProjectDto, userId?: string): Promise<ProjectEntity>;
    getProjectMembers(projectId: string): Promise<ProjectMemberEntity[]>;
    addProjectMember(projectId: string, userId: string, role: string): Promise<ProjectMemberEntity>;
    updateProjectMemberRole(memberId: string, role: string): Promise<ProjectMemberEntity>;
    removeProjectMember(memberId: string): Promise<void>;
    seedDemoTasks(projectId: string, organizationId: string, reporterId: string): Promise<{
        created: number;
    }>;
}
