import { Controller, Get, Post, Body, Param, UseGuards, ForbiddenException, Headers } from '@nestjs/common';
import { CurrentUserId } from '../../common/decorators/current-user.decorator';
import { SkipThrottle } from '@nestjs/throttler';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { OrganizationResponseDto } from './dto/organization-response.dto';
import { OrganizationMemberEntity } from './entities/organization-member.entity';

@Controller('organizations')
@SkipThrottle({ auth: true })
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  async list(@CurrentUserId() userId: string): Promise<OrganizationResponseDto[]> {
    const orgs = await this.organizationsService.findOrganizationsForUser(userId);
    return orgs.map((org) => this.toResponse(org));
  }

  @Post()
  async create(
    @Body() dto: CreateOrganizationDto,
    @CurrentUserId() ownerId: string,
  ): Promise<OrganizationResponseDto> {
    const org = await this.organizationsService.create(ownerId, dto);
    return this.toResponse(org);
  }

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
