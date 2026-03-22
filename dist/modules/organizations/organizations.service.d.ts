import { DataSource } from 'typeorm';
import { OrganizationsRepository } from './repositories/organizations.repository';
import { OrganizationMembersRepository } from './repositories/organization-members.repository';
import { OrganizationEntity } from './entities/organization.entity';
import { OrganizationMemberEntity } from './entities/organization-member.entity';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
export declare class OrganizationsService {
    private readonly organizationsRepository;
    private readonly orgMembersRepository;
    private readonly dataSource;
    constructor(organizationsRepository: OrganizationsRepository, orgMembersRepository: OrganizationMembersRepository, dataSource: DataSource);
    findById(id: string): Promise<OrganizationEntity | null>;
    findBySlug(slug: string): Promise<OrganizationEntity | null>;
    findOrganizationsForUser(userId: string): Promise<OrganizationEntity[]>;
    findOrganizationsWithRoleForUser(userId: string): Promise<{
        org: OrganizationEntity;
        role: string;
    }[]>;
    create(ownerId: string, dto: CreateOrganizationDto): Promise<OrganizationEntity>;
    getMembers(organizationId: string): Promise<OrganizationMemberEntity[]>;
    getMemberCount(organizationId: string): Promise<number>;
    canAccess(organizationId: string, userId: string): Promise<boolean>;
    update(id: string, dto: UpdateOrganizationDto): Promise<OrganizationEntity | null>;
    getMembership(organizationId: string, userId: string): Promise<OrganizationMemberEntity | null>;
    getWorkspaceProgress(organizationId: string): Promise<{
        hasProjects: boolean;
        hasMembers: boolean;
        hasTasks: boolean;
    }>;
    updateMemberRole(organizationId: string, memberId: string, role: string, actorUserId: string): Promise<OrganizationMemberEntity>;
    removeMember(organizationId: string, memberId: string, actorUserId: string): Promise<void>;
    delete(id: string, userId: string): Promise<void>;
}
