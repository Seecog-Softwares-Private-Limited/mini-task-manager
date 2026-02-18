import { ProjectsService } from './projects.service';
import { WorkflowsService } from '../workflows/workflows.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddProjectMemberDto } from './dto/add-project-member.dto';
import { UpdateProjectMemberRoleDto } from './dto/update-project-member-role.dto';
import { ProjectResponseDto } from './dto/project-response.dto';
export declare class ProjectsController {
    private readonly projectsService;
    private readonly workflowsService;
    private readonly logger;
    constructor(projectsService: ProjectsService, workflowsService: WorkflowsService);
    create(dto: CreateProjectDto, tenantId?: string, createdBy?: string): Promise<ProjectResponseDto>;
    findAll(tenantId?: string): Promise<ProjectResponseDto[]>;
    getCount(tenantId?: string): Promise<{
        count: number;
    }>;
    getMembers(projectId: string): Promise<{
        id: string;
        projectId: string;
        userId: string;
        role: string;
        user: {
            id: string;
            fullName: string;
            email: string;
            avatarUrl: string | undefined;
        } | undefined;
    }[]>;
    addMember(projectId: string, dto: AddProjectMemberDto): Promise<{
        id: string;
        projectId: string;
        userId: string;
        role: string;
        user: {
            id: string;
            fullName: string;
            email: string;
            avatarUrl: string | undefined;
        } | undefined;
    }>;
    updateMemberRole(memberId: string, dto: UpdateProjectMemberRoleDto): Promise<{
        id: string;
        projectId: string;
        userId: string;
        role: string;
        user: {
            id: string;
            fullName: string;
            email: string;
            avatarUrl: string | undefined;
        } | undefined;
    }>;
    removeMember(memberId: string): Promise<{
        success: boolean;
    }>;
    findOne(id: string, tenantId?: string): Promise<ProjectResponseDto | null>;
    update(id: string, dto: UpdateProjectDto, tenantId?: string): Promise<ProjectResponseDto>;
    private toResponse;
    private toMemberResponse;
}
