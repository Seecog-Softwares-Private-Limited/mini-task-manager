import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { SitesService } from './sites.service';
import { SiteEntity } from './entities/site.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUserId } from '../../common/decorators/current-user.decorator';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';
import { SiteResponseDto } from './dto/site-response.dto';

@Controller('sites')
@SkipThrottle({ auth: true })
@UseGuards(JwtAuthGuard, TenantGuard)
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Get()
  async findAll(@TenantId() tenantId?: string): Promise<SiteResponseDto[]> {
    const sites = await this.sitesService.findByOrganization(tenantId!);
    return sites.map((s) => this.toResponse(s));
  }

  @Get('count')
  async getCount(@TenantId() tenantId?: string): Promise<{ count: number }> {
    const count = await this.sitesService.countByOrganization(tenantId!);
    return { count };
  }

  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  @Post()
  async create(
    @Body() dto: CreateSiteDto,
    @TenantId() tenantId?: string,
    @CurrentUserId() createdBy?: string,
  ): Promise<SiteResponseDto> {
    const site = await this.sitesService.create(tenantId!, createdBy!, dto);
    return this.toResponse(site);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @TenantId() tenantId?: string,
  ): Promise<SiteResponseDto | null> {
    const site = await this.sitesService.findByIdInOrganization(id, tenantId!);
    if (!site) return null;
    return this.toResponse(site);
  }

  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSiteDto,
    @TenantId() tenantId?: string,
    @CurrentUserId() userId?: string,
  ): Promise<SiteResponseDto> {
    const site = await this.sitesService.update(id, tenantId!, dto, userId);
    return this.toResponse(site);
  }

  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @TenantId() tenantId?: string,
    @CurrentUserId() userId?: string,
  ): Promise<{ success: boolean }> {
    await this.sitesService.deletePermanently(id, tenantId!, userId);
    return { success: true };
  }

  private toResponse(s: SiteEntity): SiteResponseDto {
    const entity = s as SiteEntity & { createdAt?: Date; updatedAt?: Date };
    return {
      id: s.id,
      organizationId: s.organizationId,
      name: s.name,
      address: s.address ?? undefined,
      isArchived: s.isArchived,
      createdBy: s.createdBy,
      createdAt: entity.createdAt?.toISOString?.() ?? new Date().toISOString(),
      updatedAt: entity.updatedAt?.toISOString?.() ?? new Date().toISOString(),
    };
  }
}
