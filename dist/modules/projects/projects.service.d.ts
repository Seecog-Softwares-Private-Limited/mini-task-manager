import { ProjectsRepository } from './repositories/projects.repository';
import { ProjectMembersRepository } from './repositories/project-members.repository';
import { ProjectEntity } from './entities/project.entity';
import { ProjectMemberEntity } from './entities/project-member.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
export declare class ProjectsService {
    private readonly projectsRepository;
    private readonly projectMembersRepository;
    constructor(projectsRepository: ProjectsRepository, projectMembersRepository: ProjectMembersRepository);
    findById(id: string): Promise<ProjectEntity | null>;
    findByIdInOrganization(id: string, organizationId: string): Promise<ProjectEntity | null>;
    findByOrganization(organizationId: string): Promise<ProjectEntity[]>;
    create(organizationId: string, createdBy: string, dto: CreateProjectDto): Promise<ProjectEntity>;
    update(id: string, organizationId: string, dto: UpdateProjectDto): Promise<ProjectEntity>;
    getProjectMembers(projectId: string): Promise<ProjectMemberEntity[]>;
    addProjectMember(projectId: string, userId: string, role: string): Promise<ProjectMemberEntity>;
    updateProjectMemberRole(memberId: string, role: string): Promise<ProjectMemberEntity>;
    removeProjectMember(memberId: string): Promise<void>;
}
