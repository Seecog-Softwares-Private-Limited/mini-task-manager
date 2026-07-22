import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { createReadStream } from 'fs';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlatformAdminGuard } from './guards/platform-admin.guard';
import { SuperAdminService } from './super-admin.service';
import {
  SuperAdminImpersonateDto,
  SuperAdminPlanUpsertDto,
  SuperAdminSendNotificationDto,
  SuperAdminSetTenantStatusDto,
  SuperAdminSettingsUpdateDto,
  SuperAdminStopImpersonationDto,
  SuperAdminSubscriptionActionDto,
  SuperAdminTenantQueryDto,
  SuperAdminUserQueryDto,
} from './dto/super-admin.dto';
import { UpdatePlanConfigurationDto } from '../../plans/dto/update-plan-configuration.dto';
import { CreateCouponDto } from '../../plans/dto/create-coupon.dto';
import { PlanConfigurationsService } from '../../plans/plan-configurations.service';
import { CouponCodesService } from '../../plans/coupon-codes.service';
import { normalizePlanSlug } from '../../config/plans.config';
import { SkipThrottle } from '@nestjs/throttler';
import { PaginationQueryDto } from '../../common/pagination';
import { FeedbacksService } from '../feedbacks/feedbacks.service';
import { FeedbackResponseDto } from '../feedbacks/dto/feedback-response.dto';

@Controller('super-admin')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@SkipThrottle({ default: true, auth: true })
export class SuperAdminController {
  constructor(
    private readonly superAdminService: SuperAdminService,
    private readonly planConfigurationsService: PlanConfigurationsService,
    private readonly couponCodesService: CouponCodesService,
    private readonly feedbacksService: FeedbacksService,
  ) {}

  @Get('dashboard')
  dashboard() {
    return this.superAdminService.dashboard();
  }

  @Get('tenants')
  tenants(@Query() query: SuperAdminTenantQueryDto) {
    return this.superAdminService.tenants(query);
  }

  @Get('tenants/:id')
  tenantById(@Param('id') id: string) {
    return this.superAdminService.tenantById(id);
  }

  @Patch('tenants/:id/status')
  setTenantStatus(@Param('id') id: string, @Body() dto: SuperAdminSetTenantStatusDto) {
    return this.superAdminService.setTenantStatus(id, dto.status, dto.reason);
  }

  @Delete('tenants/:id')
  deleteTenant(@Param('id') id: string) {
    return this.superAdminService.deleteTenant(id);
  }

  @Get('users')
  users(@Query() query: SuperAdminUserQueryDto) {
    return this.superAdminService.users(query);
  }

  @Patch('users/:id/active')
  setUserActive(@Param('id') id: string, @Body() dto: { active: boolean }) {
    return this.superAdminService.setUserActive(id, dto.active);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.superAdminService.deleteUser(id);
  }

  @Get('plans')
  plans() {
    return this.superAdminService.plans();
  }

  @Post('plans')
  upsertPlan(@Body() dto: SuperAdminPlanUpsertDto) {
    return this.superAdminService.upsertPlan(dto);
  }

  @Delete('plans/:id')
  deletePlan(@Param('id') id: string) {
    return this.superAdminService.deletePlan(id);
  }

  @Get('plan-configurations')
  planConfigurations() {
    return this.planConfigurationsService.getAll();
  }

  @Put('plan-configurations/:planName')
  updatePlanConfiguration(
    @Param('planName') planName: string,
    @Body() dto: UpdatePlanConfigurationDto,
  ) {
    return this.planConfigurationsService.updatePlan(normalizePlanSlug(planName), dto);
  }

  @Get('coupon-codes')
  listCouponCodes() {
    return this.couponCodesService.listAll();
  }

  @Post('coupon-codes')
  createCouponCode(
    @Req() req: { user: { userId: string } },
    @Body() dto: CreateCouponDto,
  ) {
    return this.couponCodesService.create(dto, req.user.userId);
  }

  @Patch('coupon-codes/:id/active')
  setCouponActive(@Param('id') id: string, @Body() dto: { isActive: boolean }) {
    return this.couponCodesService.setActive(id, dto.isActive);
  }

  @Delete('coupon-codes/:id')
  deactivateCouponCode(@Param('id') id: string) {
    return this.couponCodesService.delete(id);
  }

  @Get('subscriptions')
  subscriptions() {
    return this.superAdminService.subscriptions();
  }

  @Post('subscriptions/action')
  subscriptionAction(@Body() dto: SuperAdminSubscriptionActionDto) {
    return this.superAdminService.subscriptionAction(dto);
  }

  @Get('audit-logs')
  auditLogs(
    @Query('userId') userId?: string,
    @Query('organizationId') organizationId?: string,
    @Query('entity') entity?: string,
    @Query('action') action?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.superAdminService.globalAuditLogs({
      userId,
      organizationId,
      entity,
      action,
      from,
      to,
      page,
      limit,
    });
  }

  @Get('analytics')
  analytics() {
    return this.superAdminService.analytics();
  }

  @Get('settings')
  settings() {
    return this.superAdminService.listSettings();
  }

  @Post('settings')
  upsertSetting(@Body() dto: SuperAdminSettingsUpdateDto) {
    return this.superAdminService.upsertSetting(dto);
  }

  @Post('notifications')
  sendNotification(
    @Req() req: { user: { userId: string } },
    @Body() dto: SuperAdminSendNotificationDto,
  ) {
    return this.superAdminService.sendNotification(req.user.userId, dto);
  }

  @Post('impersonation/start')
  startImpersonation(
    @Req() req: { user: { userId: string } },
    @Body() dto: SuperAdminImpersonateDto,
  ) {
    return this.superAdminService.impersonate(req.user.userId, dto);
  }

  @Post('impersonation/stop')
  stopImpersonation(
    @Req() req: { user: { userId: string } },
    @Body() dto: SuperAdminStopImpersonationDto,
  ) {
    return this.superAdminService.stopImpersonation(req.user.userId, dto.sessionId);
  }

  @Get('feedbacks')
  feedbacks(@Query() query: PaginationQueryDto) {
    return this.feedbacksService.findAllForSuperAdmin(query);
  }

  @Get('feedbacks/:id/media/:mediaId')
  async feedbackMedia(
    @Param('id') id: string,
    @Param('mediaId') mediaId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const file = await this.feedbacksService.getMediaFileForSuperAdmin(id, mediaId);
    if (file.mimeType) res.setHeader('Content-Type', file.mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(file.fileName)}"`,
    );
    return new StreamableFile(createReadStream(file.path));
  }

  @Get('feedbacks/:id')
  feedbackById(@Param('id') id: string): Promise<FeedbackResponseDto> {
    return this.feedbacksService.findOneForSuperAdmin(id);
  }
}

