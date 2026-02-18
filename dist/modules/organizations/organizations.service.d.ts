import { DataSource } from 'typeorm';
import { OrganizationsRepository } from './repositories/organizations.repository';
import { OrganizationMembersRepository } from './repositories/organization-members.repository';
import { OrganizationEntity } from './entities/organization.entity';
import { OrganizationMemberEntity } from './entities/organization-member.entity';
import { CreateOrganizationDto } from './dto/create-organization.dto';
export declare class OrganizationsService {
    private readonly organizationsRepository;
    private readonly orgMembersRepository;
    private readonly dataSource;
    constructor(organizationsRepository: OrganizationsRepository, orgMembersRepository: OrganizationMembersRepository, dataSource: DataSource);
    findById(id: string): Promise<OrganizationEntity | null>;
    findBySlug(slug: string): Promise<OrganizationEntity | null>;
    findOrganizationsForUser(userId: string): Promise<OrganizationEntity[]>;
    create(ownerId: string, dto: CreateOrganizationDto): Promise<OrganizationEntity>;
    getMembers(organizationId: string): Promise<OrganizationMemberEntity[]>;
    canAccess(organizationId: string, userId: string): Promise<boolean>;
}
