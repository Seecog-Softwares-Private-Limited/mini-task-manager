import { Repository } from 'typeorm';
import { OrganizationEntity } from '../entities/organization.entity';
export declare class OrganizationsRepository {
    private readonly repo;
    constructor(repo: Repository<OrganizationEntity>);
    findById(id: string): Promise<OrganizationEntity | null>;
    findBySlug(slug: string): Promise<OrganizationEntity | null>;
    create(data: Partial<OrganizationEntity>): Promise<OrganizationEntity>;
    update(id: string, data: Partial<OrganizationEntity>): Promise<void>;
    delete(id: string): Promise<void>;
}
