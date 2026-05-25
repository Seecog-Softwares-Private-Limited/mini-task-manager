import { Repository } from 'typeorm';
import { ProjectEntity } from '../entities/project.entity';
export declare class ProjectsRepository {
    private readonly repo;
    constructor(repo: Repository<ProjectEntity>);
    findById(id: string): Promise<ProjectEntity | null>;
    findByIdAndOrganization(id: string, organizationId: string): Promise<ProjectEntity | null>;
    findByOrganization(organizationId: string): Promise<ProjectEntity[]>;
    countByOrganization(organizationId: string): Promise<number>;
    findByName(name: string, organizationId: string): Promise<ProjectEntity | null>;
    create(data: Partial<ProjectEntity>): Promise<ProjectEntity>;
    update(id: string, data: Partial<ProjectEntity>): Promise<void>;
}
