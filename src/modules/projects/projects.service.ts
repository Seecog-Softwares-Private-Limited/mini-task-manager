import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ProjectsRepository } from './repositories/projects.repository';
import { ProjectMembersRepository } from './repositories/project-members.repository';
import { ProjectEntity } from './entities/project.entity';
import { ProjectMemberEntity } from './entities/project-member.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly projectsRepository: ProjectsRepository,
    private readonly projectMembersRepository: ProjectMembersRepository,
  ) {}

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

  async update(
    id: string,
    organizationId: string,
    dto: UpdateProjectDto,
  ): Promise<ProjectEntity> {
    const project = await this.projectsRepository.findByIdAndOrganization(id, organizationId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    const payload: Partial<ProjectEntity> = {};
    if (dto.name !== undefined) payload.name = dto.name;
    if (dto.description !== undefined) payload.description = dto.description ?? null;
    if (dto.visibility !== undefined) payload.visibility = dto.visibility;
    if (dto.isArchived !== undefined) payload.isArchived = dto.isArchived;
    if (Object.keys(payload).length === 0) return project;
    await this.projectsRepository.update(id, payload);
    const updated = await this.projectsRepository.findByIdAndOrganization(id, organizationId);
    return updated!;
  }

  // ── Project Members ──

  async getProjectMembers(projectId: string): Promise<ProjectMemberEntity[]> {
    return this.projectMembersRepository.findByProjectWithUser(projectId);
  }

  async addProjectMember(projectId: string, userId: string, role: string): Promise<ProjectMemberEntity> {
    const existing = await this.projectMembersRepository.findByProjectAndUser(projectId, userId);
    if (existing) {
      throw new ConflictException('User is already a member of this project');
    }
    const member = await this.projectMembersRepository.create({ projectId, userId, role });
    const withUser = await this.projectMembersRepository.findById(member.id);
    return withUser ?? member;
  }

  async updateProjectMemberRole(memberId: string, role: string): Promise<ProjectMemberEntity> {
    const member = await this.projectMembersRepository.findById(memberId);
    if (!member) throw new NotFoundException('Project member not found');
    await this.projectMembersRepository.updateRole(memberId, role);
    return { ...member, role };
  }

  async removeProjectMember(memberId: string): Promise<void> {
    const member = await this.projectMembersRepository.findById(memberId);
    if (!member) throw new NotFoundException('Project member not found');
    await this.projectMembersRepository.delete(memberId);
  }
}
