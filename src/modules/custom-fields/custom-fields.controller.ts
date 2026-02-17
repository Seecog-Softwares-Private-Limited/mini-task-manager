import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { CustomFieldsService } from './custom-fields.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CreateCustomFieldDto } from './dto/create-custom-field.dto';
import { CustomFieldResponseDto } from './dto/custom-field-response.dto';

@Controller('custom-fields')
@SkipThrottle({ auth: true })
@UseGuards(JwtAuthGuard, TenantGuard)
export class CustomFieldsController {
  constructor(private readonly customFieldsService: CustomFieldsService) {}

  @Post()
  async create(@Body() dto: CreateCustomFieldDto): Promise<CustomFieldResponseDto> {
    const projectId = dto.projectId!;
    const field = await this.customFieldsService.create(projectId, dto);
    return { id: field.id, projectId: field.projectId, name: field.name, fieldType: field.fieldType, isRequired: field.isRequired };
  }

  @Get('project/:projectId')
  async findByProject(
    @Param('projectId') projectId: string,
    @TenantId() tenantId: string,
  ): Promise<CustomFieldResponseDto[]> {
    const list = await this.customFieldsService.findByProject(projectId, tenantId);
    return list.map((f) => ({ id: f.id, projectId: f.projectId, name: f.name, fieldType: f.fieldType, isRequired: f.isRequired }));
  }
}
