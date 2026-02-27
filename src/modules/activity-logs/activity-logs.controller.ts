import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ActivityLogsService } from './activity-logs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { PaginationQueryDto } from '../../common/pagination';
import type { ActivityLogEntity } from './entities/activity-log.entity';

function toResponseItem(entity: ActivityLogEntity & { user?: { fullName?: string; email?: string } | null }) {
  return {
    id: entity.id,
    organizationId: entity.organizationId,
    userId: entity.userId,
    entityType: entity.entityType,
    entityId: entity.entityId,
    action: entity.action,
    metadata: entity.metadata,
    createdAt: entity.createdAt,
    user: entity.user ? { fullName: entity.user.fullName, email: entity.user.email } : null,
  };
}

@Controller('activity-logs')
@SkipThrottle({ auth: true })
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Roles('owner', 'admin')
export class ActivityLogsController {
  constructor(private readonly activityLogsService: ActivityLogsService) {}

  @Get()
  async findAll(@TenantId() tenantId?: string, @Query() query?: PaginationQueryDto) {
    const result = await this.activityLogsService.findByOrganization(tenantId!, query);
    return {
      ...result,
      data: result.data.map((e) => toResponseItem(e as any)),
    };
  }
}
