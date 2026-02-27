import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { SSOService, type UpsertSSOConfigDto, type SSOConfigResponse } from './sso.service';

@Controller('sso')
@SkipThrottle({ auth: true })
@UseGuards(JwtAuthGuard, TenantGuard)
export class SSOController {
  constructor(private readonly ssoService: SSOService) {}

  /** Get current SSO config for the organization (or null). */
  @Get()
  async getConfig(@TenantId() tenantId: string): Promise<SSOConfigResponse | null> {
    return this.ssoService.getConfig(tenantId);
  }

  /** Create or update SSO config. Requires plan with SSO feature. */
  @Post()
  async upsertConfig(
    @TenantId() tenantId: string,
    @Body() dto: UpsertSSOConfigDto,
  ): Promise<SSOConfigResponse> {
    return this.ssoService.upsertConfig(tenantId, dto);
  }

  /** Toggle SSO enabled/disabled. */
  @Patch('toggle')
  async toggleEnabled(
    @TenantId() tenantId: string,
    @Body() body: { enabled: boolean },
  ): Promise<SSOConfigResponse> {
    return this.ssoService.toggleEnabled(tenantId, body.enabled);
  }

  /** Delete SSO config entirely. */
  @Delete()
  async deleteConfig(@TenantId() tenantId: string): Promise<{ success: boolean }> {
    await this.ssoService.deleteConfig(tenantId);
    return { success: true };
  }
}
