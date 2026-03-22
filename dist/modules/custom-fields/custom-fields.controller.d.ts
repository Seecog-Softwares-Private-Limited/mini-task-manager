import { CustomFieldsService } from './custom-fields.service';
import { CreateCustomFieldDto } from './dto/create-custom-field.dto';
import { CustomFieldResponseDto } from './dto/custom-field-response.dto';
export declare class CustomFieldsController {
    private readonly customFieldsService;
    constructor(customFieldsService: CustomFieldsService);
    create(dto: CreateCustomFieldDto): Promise<CustomFieldResponseDto>;
    findByProject(projectId: string, tenantId: string): Promise<CustomFieldResponseDto[]>;
}
