import { Controller, Get, Query, Res, UseGuards, ForbiddenException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ActivityLogsService } from './activity-logs.service';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { PaginationQueryDto } from '../../common/pagination';
import { UsageService } from '../billing/usage.service';
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
@UseGuards(TenantGuard, RolesGuard)
@Roles('owner', 'admin')
export class ActivityLogsController {
  constructor(
    private readonly activityLogsService: ActivityLogsService,
    private readonly usageService: UsageService,
  ) {}

  private async assertAuditEnabled(tenantId: string) {
    const flags = await this.usageService.getFeatureFlags(tenantId);
    if (!flags.auditLogsEnabled) {
      throw new ForbiddenException(
        'Audit logs are not available on your current plan. Upgrade to Enterprise.',
      );
    }
  }

  @Get()
  async findAll(@TenantId() tenantId?: string, @Query() query?: PaginationQueryDto) {
    await this.assertAuditEnabled(tenantId!);
    const result = await this.activityLogsService.findByOrganization(tenantId!, query);
    return {
      ...result,
      data: result.data.map((e) => toResponseItem(e as any)),
    };
  }

  @Get('export')
  async exportCsv(@TenantId() tenantId: string, @Res() res: Response) {
    await this.assertAuditEnabled(tenantId);
    const csv = await this.activityLogsService.exportCsv(tenantId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="audit-log.csv"');
    res.send(csv);
  }
}
