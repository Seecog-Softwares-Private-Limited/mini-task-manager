import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { OrganizationResponseDto } from './dto/organization-response.dto';
export declare class OrganizationsController {
    private readonly organizationsService;
    constructor(organizationsService: OrganizationsService);
    list(userId: string): Promise<OrganizationResponseDto[]>;
    create(dto: CreateOrganizationDto, ownerId: string): Promise<OrganizationResponseDto>;
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
    findOne(id: string, userId: string, orgIdHeader?: string): Promise<OrganizationResponseDto | null>;
    private toResponse;
    private toMemberResponse;
}
