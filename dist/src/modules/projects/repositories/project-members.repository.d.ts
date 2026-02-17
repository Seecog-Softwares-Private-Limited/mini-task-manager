import { Repository } from 'typeorm';
import { ProjectMemberEntity } from '../entities/project-member.entity';
export declare class ProjectMembersRepository {
    private readonly repo;
    constructor(repo: Repository<ProjectMemberEntity>);
    findByProject(projectId: string): Promise<ProjectMemberEntity[]>;
    findByProjectAndUser(projectId: string, userId: string): Promise<ProjectMemberEntity | null>;
    create(data: Partial<ProjectMemberEntity>): Promise<ProjectMemberEntity>;
}
