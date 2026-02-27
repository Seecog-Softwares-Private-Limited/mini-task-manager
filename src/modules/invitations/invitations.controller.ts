import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
  Headers,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SubscriptionGuard } from '../billing/guards/subscription.guard';
import { CheckSubscriptionLimit } from '../billing/decorators/check-limit.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUserId } from '../../common/decorators/current-user.decorator';
import { InvitationsService } from './invitations.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { OrganizationInvitationEntity } from './entities/organization-invitation.entity';

@Controller()
@SkipThrottle({ auth: true })
export class InvitationsController {
  constructor(
    private readonly invitationsService: InvitationsService,
    private readonly orgsService: OrganizationsService,
  ) {}

  /** POST /organizations/:id/invitations — create and send invite */
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, SubscriptionGuard)
  @Roles('owner', 'admin')
  @CheckSubscriptionLimit('users')
  @Post('organizations/:id/invitations')
  async create(
    @Param('id') orgId: string,
    @Body() dto: CreateInvitationDto,
    @CurrentUserId() userId: string,
    @Headers('x-organization-id') orgIdHeader?: string,
  ) {
    const headerOrgId = orgIdHeader?.trim();
    if (!headerOrgId || headerOrgId !== orgId) {
      throw new ForbiddenException('X-Organization-Id must match the requested organization');
    }
    const canAccess = await this.orgsService.canAccess(orgId, userId);
    if (!canAccess) {
      throw new ForbiddenException('You do not have access to this organization');
    }

    const invitation = await this.invitationsService.createInvitation(
      orgId,
      dto.email,
      dto.role,
      userId,
    );
    return this.toResponse(invitation);
  }

  /** GET /organizations/:id/invitations — list invitations */
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles('owner', 'admin')
  @Get('organizations/:id/invitations')
  async list(
    @Param('id') orgId: string,
    @CurrentUserId() userId: string,
    @Headers('x-organization-id') orgIdHeader?: string,
  ) {
    const headerOrgId = orgIdHeader?.trim();
    if (!headerOrgId || headerOrgId !== orgId) {
      throw new ForbiddenException('X-Organization-Id must match the requested organization');
    }
    const canAccess = await this.orgsService.canAccess(orgId, userId);
    if (!canAccess) {
      throw new ForbiddenException('You do not have access to this organization');
    }

    const invitations = await this.invitationsService.listByOrganization(orgId);
    return invitations.map((inv) => this.toResponse(inv));
  }

  /** POST /organizations/:id/invitations/:invId/resend — resend invite email */
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles('owner', 'admin')
  @Post('organizations/:id/invitations/:invId/resend')
  async resend(
    @Param('id') orgId: string,
    @Param('invId') invId: string,
    @CurrentUserId() userId: string,
    @Headers('x-organization-id') orgIdHeader?: string,
  ) {
    const headerOrgId = orgIdHeader?.trim();
    if (!headerOrgId || headerOrgId !== orgId) {
      throw new ForbiddenException('X-Organization-Id must match the requested organization');
    }
    const canAccess = await this.orgsService.canAccess(orgId, userId);
    if (!canAccess) {
      throw new ForbiddenException('You do not have access to this organization');
    }

    const invitation = await this.invitationsService.resendInvitation(invId, orgId);
    return this.toResponse(invitation);
  }

  /** PATCH /organizations/:id/invitations/:invId/cancel — cancel invite */
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles('owner', 'admin')
  @Patch('organizations/:id/invitations/:invId/cancel')
  async cancel(
    @Param('id') orgId: string,
    @Param('invId') invId: string,
    @CurrentUserId() userId: string,
    @Headers('x-organization-id') orgIdHeader?: string,
  ) {
    const headerOrgId = orgIdHeader?.trim();
    if (!headerOrgId || headerOrgId !== orgId) {
      throw new ForbiddenException('X-Organization-Id must match the requested organization');
    }
    const canAccess = await this.orgsService.canAccess(orgId, userId);
    if (!canAccess) {
      throw new ForbiddenException('You do not have access to this organization');
    }

    await this.invitationsService.cancelInvitation(invId, orgId);
    return { success: true };
  }

  /** GET /invitations/validate?token= — public token validation (legacy query param) */
  @Public()
  @Get('invitations/validate')
  async validateQuery(@Query('token') token: string) {
    if (!token) {
      return { valid: false, reason: 'Token is required' };
    }
    const result = await this.invitationsService.validateToken(token);
    if (!result.valid) {
      return { valid: false, reason: result.reason };
    }
    return {
      valid: true,
      email: result.invitation!.email,
      organizationName: result.invitation!.organization?.name ?? 'Unknown',
      role: result.invitation!.role,
    };
  }

  /** GET /invitations/validate/:token — public token validation (path param, enriched response) */
  @Public()
  @Get('invitations/validate/:token')
  async validatePath(@Param('token') token: string) {
    const result = await this.invitationsService.validateTokenEnriched(token);
    if (!result.valid) {
      return result;
    }
    return result;
  }

  /** POST /invitations/accept — accept invite (authenticated, token in body) */
  @UseGuards(JwtAuthGuard)
  @Post('invitations/accept')
  async accept(
    @Body() dto: AcceptInvitationDto,
    @CurrentUserId() userId: string,
  ) {
    const result = await this.invitationsService.acceptInvitation(dto.token, userId);
    return { success: true, organizationId: result.organizationId };
  }

  /** POST /invitations/accept/:token — accept invite (authenticated, token in path) */
  @UseGuards(JwtAuthGuard)
  @Post('invitations/accept/:token')
  async acceptByPath(
    @Param('token') token: string,
    @CurrentUserId() userId: string,
  ) {
    const result = await this.invitationsService.acceptInvitation(token, userId);
    return { success: true, organizationId: result.organizationId };
  }

  private toResponse(inv: OrganizationInvitationEntity) {
    return {
      id: inv.id,
      organizationId: inv.organizationId,
      email: inv.email,
      role: inv.role,
      status: inv.status,
      expiresAt: inv.expiresAt,
      createdAt: inv.createdAt,
      inviter: inv.inviter
        ? {
            id: inv.inviter.id,
            fullName: inv.inviter.fullName,
            email: inv.inviter.email,
          }
        : undefined,
    };
  }
}
