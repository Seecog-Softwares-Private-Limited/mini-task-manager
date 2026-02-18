import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationResponseDto } from './dto/organization-response.dto';
export declare class OrganizationsController {
    private readonly organizationsService;
    constructor(organizationsService: OrganizationsService);
    list(userId: string): Promise<OrganizationResponseDto[]>;
    checkSlugAvailable(slug: string | undefined): Promise<{
        available: boolean;
    }>;
    create(dto: CreateOrganizationDto, ownerId: string): Promise<OrganizationResponseDto>;
    getMemberCount(id: string, userId: string, orgIdHeader?: string): Promise<{
        count: number;
    }>;
    getMembers(id: string, userId: string, orgIdHeader?: string): Promise<{
        id: string;
        organizationId: string;
        userId: string;
        role: string;
        status: string;
        joinedAt: Date;
        user: {
            id: string;
            fullName: string;
            email: string;
            avatarUrl: string | undefined;
            lastSeenAt: string | undefined;
        } | undefined;
    }[]>;
    update(id: string, dto: UpdateOrganizationDto, userId: string, orgIdHeader?: string): Promise<OrganizationResponseDto>;
    delete(id: string, userId: string, orgIdHeader?: string): Promise<{
        success: boolean;
    }>;
    findOne(id: string, userId: string, orgIdHeader?: string): Promise<OrganizationResponseDto | null>;
    private toResponse;
    private toMemberResponse;
}
