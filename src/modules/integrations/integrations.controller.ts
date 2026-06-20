import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUserId } from '../../common/decorators/current-user.decorator';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { IntegrationsService } from './integrations.service';

@Controller('integrations')
@UseGuards(TenantGuard, RolesGuard)
@Roles('owner', 'admin')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get()
  list(@TenantId() tenantId: string, @CurrentUserId() userId: string) {
    return this.integrationsService.list(tenantId, userId);
  }

  @Get('slack/oauth-url')
  slackOAuthUrl(@TenantId() tenantId: string, @CurrentUserId() userId: string) {
    return this.integrationsService.getSlackOAuthUrl(tenantId, userId);
  }

  @Post('slack/callback')
  slackCallback(
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Body() body: { code: string },
  ) {
    return this.integrationsService.completeSlackOAuth(tenantId, userId, body.code);
  }

  @Delete(':provider')
  disconnect(
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Param('provider') provider: string,
  ) {
    return this.integrationsService.disconnect(tenantId, userId, provider);
  }
}
