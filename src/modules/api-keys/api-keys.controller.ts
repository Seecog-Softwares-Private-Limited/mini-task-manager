import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiKeysService } from './api-keys.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SubscriptionGuard } from '../billing/guards/subscription.guard';
import { CheckSubscriptionLimit } from '../billing/decorators/check-limit.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUserId } from '../../common/decorators/current-user.decorator';

@Controller('api-keys')
@SkipThrottle({ auth: true })
@UseGuards(JwtAuthGuard, TenantGuard)
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Get()
  async list(@TenantId() tenantId?: string, @CurrentUserId() userId?: string) {
    const keys = await this.apiKeysService.listByOrganization(tenantId!, userId!);
    return keys.map((k) => ({
      id: k.id,
      name: k.name,
      keyPrefix: k.keyPrefix,
      lastUsedAt: k.lastUsedAt,
      createdAt: k.createdAt,
    }));
  }

  @Post()
  @UseGuards(RolesGuard, SubscriptionGuard)
  @Roles('owner')
  @CheckSubscriptionLimit('apiKeys')
  async create(
    @Body() body: { name: string },
    @TenantId() tenantId?: string,
    @CurrentUserId() userId?: string,
  ) {
    return this.apiKeysService.create(tenantId!, userId!, body.name);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('owner')
  async revoke(@Param('id') id: string, @TenantId() tenantId?: string, @CurrentUserId() userId?: string) {
    await this.apiKeysService.revoke(id, tenantId!, userId!);
    return { success: true };
  }
}
