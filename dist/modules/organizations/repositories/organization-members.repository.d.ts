import { Repository } from 'typeorm';
import { OrganizationMemberEntity } from '../entities/organization-member.entity';
import { IOrganizationMembersRepository } from './organization-members.repository.interface';
export declare class OrganizationMembersRepository implements IOrganizationMembersRepository {
    private readonly repo;
    constructor(repo: Repository<OrganizationMemberEntity>);
    findByOrganizationAndUser(organizationId: string, userId: string): Promise<OrganizationMemberEntity | null>;
    findByOrganization(organizationId: string): Promise<OrganizationMemberEntity[]>;
    findByOrganizationWithUser(organizationId: string): Promise<OrganizationMemberEntity[]>;
    findByUser(userId: string): Promise<OrganizationMemberEntity[]>;
    create(data: Partial<OrganizationMemberEntity>): Promise<OrganizationMemberEntity>;
    update(id: string, data: Partial<OrganizationMemberEntity>): Promise<void>;
}
