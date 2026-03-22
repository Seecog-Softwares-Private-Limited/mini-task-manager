import { Repository } from 'typeorm';
import { ProjectMemberEntity } from '../entities/project-member.entity';
export declare class ProjectMembersRepository {
    private readonly repo;
    constructor(repo: Repository<ProjectMemberEntity>);
    findByProject(projectId: string): Promise<ProjectMemberEntity[]>;
    findByProjectWithUser(projectId: string): Promise<ProjectMemberEntity[]>;
    findByProjectAndUser(projectId: string, userId: string): Promise<ProjectMemberEntity | null>;
    create(data: Partial<ProjectMemberEntity>): Promise<ProjectMemberEntity>;
    updateRole(id: string, role: string): Promise<void>;
    delete(id: string): Promise<void>;
    findById(id: string): Promise<ProjectMemberEntity | null>;
}
