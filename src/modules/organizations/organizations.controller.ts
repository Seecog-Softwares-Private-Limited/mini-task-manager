import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, ForbiddenException, Headers, Query } from '@nestjs/common';
import { CurrentUserId } from '../../common/decorators/current-user.decorator';
import { SkipThrottle } from '@nestjs/throttler';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationResponseDto } from './dto/organization-response.dto';
import { OrganizationMemberEntity } from './entities/organization-member.entity';

@Controller('organizations')
@SkipThrottle({ auth: true })
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  async list(@CurrentUserId() userId: string): Promise<OrganizationResponseDto[]> {
    const items = await this.organizationsService.findOrganizationsWithRoleForUser(userId);
    return items.map(({ org, role }) => this.toResponse(org, role));
  }

  @Get('slug/available')
  async checkSlugAvailable(
    @Query('slug') slug: string | undefined,
    @Query('excludeOrganizationId') excludeOrganizationId?: string,
  ): Promise<{ available: boolean }> {
    const trimmed = typeof slug === 'string' ? slug.trim().toLowerCase() : '';
    if (!trimmed || !/^[a-z0-9-]+$/.test(trimmed)) {
      return { available: false };
    }
    const existing = await this.organizationsService.findBySlug(trimmed);
    if (!existing) {
      return { available: true };
    }
    const exclude = excludeOrganizationId?.trim();
    if (exclude && existing.id === exclude) {
      return { available: true };
    }
    return { available: false };
  }

  @Post()
  async create(
    @Body() dto: CreateOrganizationDto,
    @CurrentUserId() ownerId: string,
  ): Promise<OrganizationResponseDto> {
    const org = await this.organizationsService.create(ownerId, dto);
    return this.toResponse(org, 'owner');
  }

  @Get(':id/workspace-progress')
  async getWorkspaceProgress(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
    @Headers('x-organization-id') orgIdHeader?: string,
  ) {
    const headerOrgId = orgIdHeader?.trim();
    if (!headerOrgId || headerOrgId !== id) {
      throw new ForbiddenException('X-Organization-Id header is required and must match the requested organization id');
    }
    const canAccess = await this.organizationsService.canAccess(id, userId);
    if (!canAccess) {
      throw new ForbiddenException('You do not have access to this organization');
    }
    return this.organizationsService.getWorkspaceProgress(id);
  }

  @Get(':id/members/count')
  async getMemberCount(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
    @Headers('x-organization-id') orgIdHeader?: string,
  ): Promise<{ count: number }> {
    const headerOrgId = orgIdHeader?.trim();
    if (!headerOrgId || headerOrgId !== id) {
      throw new ForbiddenException(
        'X-Organization-Id header is required and must match the requested organization id',
      );
    }
    const canAccess = await this.organizationsService.canAccess(id, userId);
    if (!canAccess) {
      throw new ForbiddenException('You do not have access to this organization');
    }
    const count = await this.organizationsService.getMemberCount(id);
    return { count };
  }

  @UseGuards(TenantGuard)
  @Get(':id/members')
  async getMembers(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
    @Headers('x-organization-id') orgIdHeader?: string,
  ) {
    const headerOrgId = orgIdHeader?.trim();
    if (!headerOrgId || headerOrgId !== id) {
      throw new ForbiddenException(
        'X-Organization-Id header is required and must match the requested organization id',
      );
    }
    const canAccess = await this.organizationsService.canAccess(id, userId);
    if (!canAccess) {
      throw new ForbiddenException('You do not have access to this organization');
    }
    const members = await this.organizationsService.getMembers(id);
    return members.map((m) => this.toMemberResponse(m));
  }

  @UseGuards(TenantGuard, RolesGuard)
  @Roles('owner', 'admin')
  @Patch(':id/members/:memberId')
  async updateMemberRole(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() body: { role: string },
    @CurrentUserId() userId: string,
    @Headers('x-organization-id') orgIdHeader?: string,
  ) {
    const headerOrgId = orgIdHeader?.trim();
    if (!headerOrgId || headerOrgId !== id) {
      throw new ForbiddenException(
        'X-Organization-Id header is required and must match the requested organization',
      );
    }
    const updated = await this.organizationsService.updateMemberRole(
      id,
      memberId,
      body.role,
      userId,
    );
    return this.toMemberResponse(updated);
  }

  @UseGuards(TenantGuard, RolesGuard)
  @Roles('owner', 'admin')
  @Delete(':id/members/:memberId')
  async removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUserId() userId: string,
    @Headers('x-organization-id') orgIdHeader?: string,
  ): Promise<{ success: boolean }> {
    const headerOrgId = orgIdHeader?.trim();
    if (!headerOrgId || headerOrgId !== id) {
      throw new ForbiddenException(
        'X-Organization-Id header is required and must match the requested organization',
      );
    }
    await this.organizationsService.removeMember(id, memberId, userId);
    return { success: true };
  }

  @UseGuards(TenantGuard, RolesGuard)
  @Roles('owner', 'admin')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDto,
    @CurrentUserId() userId: string,
    @Headers('x-organization-id') orgIdHeader?: string,
  ): Promise<OrganizationResponseDto> {
    const headerOrgId = orgIdHeader?.trim();
    if (!headerOrgId || headerOrgId !== id) {
      throw new ForbiddenException('X-Organization-Id must match the requested organization');
    }
    const canAccess = await this.organizationsService.canAccess(id, userId);
    if (!canAccess) {
      throw new ForbiddenException('You do not have access to this organization');
    }
    if (dto.isArchived !== undefined || dto.logoUrl !== undefined) {
      const membership = await this.organizationsService.getMembership(id, userId);
      if (dto.isArchived !== undefined && membership?.role?.toLowerCase() !== 'owner') {
        throw new ForbiddenException('Only the organization owner can archive or restore the organization');
      }
      if (dto.logoUrl !== undefined && membership?.role?.toLowerCase() !== 'owner') {
        throw new ForbiddenException('Only the organization owner can change the workspace logo');
      }
    }
    const org = await this.organizationsService.update(id, dto);
    if (!org) throw new ForbiddenException('Organization not found');
    const membership = await this.organizationsService.getMembership(org.id, userId);
    return this.toResponse(org, membership?.role);
  }

  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
    @Headers('x-organization-id') orgIdHeader?: string,
  ): Promise<{ success: boolean }> {
    const headerOrgId = orgIdHeader?.trim();
    if (!headerOrgId || headerOrgId !== id) {
      throw new ForbiddenException('X-Organization-Id must match the requested organization');
    }
    await this.organizationsService.delete(id, userId);
    return { success: true };
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
    const membership = await this.organizationsService.getMembership(org.id, userId);
    return this.toResponse(org, membership?.role);
  }

  private toResponse(
    org: { id: string; name: string; slug: string; ownerId: string; logoUrl?: string | null; isArchived?: boolean },
    myRole?: string,
  ): OrganizationResponseDto {
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      ownerId: org.ownerId,
      logoUrl: org.logoUrl ?? undefined,
      myRole: myRole ?? undefined,
      isArchived: org.isArchived ?? false,
    };
  }

  private toMemberResponse(m: OrganizationMemberEntity) {
    return {
      id: m.id,
      organizationId: m.organizationId,
      userId: m.userId,
      role: m.role,
      status: m.status,
      joinedAt: m.joinedAt,
      user: m.user
        ? {
            id: m.user.id,
            fullName: m.user.fullName,
            email: m.user.email,
            avatarUrl: m.user.avatarUrl ?? undefined,
            lastSeenAt: m.user.lastSeenAt ? (m.user.lastSeenAt as Date).toISOString() : undefined,
          }
        : undefined,
    };
  }
}
