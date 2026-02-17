import { Controller, Get, Post, Body, Param, UseGuards, ForbiddenException, Headers } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { OrganizationResponseDto } from './dto/organization-response.dto';
import { CurrentUserId } from '../../common/decorators/current-user.decorator';

@Controller('organizations')
@SkipThrottle({ auth: true })
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  async create(
    @Body() dto: CreateOrganizationDto,
    @CurrentUserId() ownerId: string,
  ): Promise<OrganizationResponseDto> {
    const org = await this.organizationsService.create(ownerId, dto);
    return this.toResponse(org);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
    @Headers('x-organization-id') orgIdHeader?: string,
  ): Promise<OrganizationResponseDto | null> {
    if (!orgIdHeader || orgIdHeader !== id) {
      throw new ForbiddenException('X-Organization-Id must match the requested organization');
    }
    const canAccess = await this.organizationsService.canAccess(id, userId);
    if (!canAccess) {
      throw new ForbiddenException('You do not have access to this organization');
    }
    const org = await this.organizationsService.findById(id);
    if (!org) return null;
    return this.toResponse(org);
  }

  private toResponse(org: { id: string; name: string; slug: string; ownerId: string }): OrganizationResponseDto {
    return { id: org.id, name: org.name, slug: org.slug, ownerId: org.ownerId };
  }
}
