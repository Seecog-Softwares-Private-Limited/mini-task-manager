import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { OrganizationResponseDto } from './dto/organization-response.dto';
export declare class OrganizationsController {
    private readonly organizationsService;
    constructor(organizationsService: OrganizationsService);
    create(dto: CreateOrganizationDto, ownerId: string): Promise<OrganizationResponseDto>;
    findOne(id: string, userId: string, orgIdHeader?: string): Promise<OrganizationResponseDto | null>;
    private toResponse;
}
