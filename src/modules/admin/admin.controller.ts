import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlatformAdminGuard } from './guards/platform-admin.guard';
import { AdminService } from './admin.service';
import {
  AdminListOrganizationsQueryDto,
  AdminSetPlanDto,
  AdminSetUserActiveDto,
  AdminSuspendOrganizationDto,
} from './dto/admin-organization.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';

function toUserDto(user: {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  isEmailVerified: boolean;
  isActive: boolean;
  isPlatformAdmin: boolean;
}): UserResponseDto {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    avatarUrl: user.avatarUrl ?? undefined,
    isEmailVerified: user.isEmailVerified,
    isActive: user.isActive,
    isPlatformAdmin: user.isPlatformAdmin,
  };
}

@Controller('admin')
@SkipThrottle({ auth: true })
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('organizations')
  listOrganizations(@Query() query: AdminListOrganizationsQueryDto) {
    const page = Math.max(1, parseInt(query.page ?? '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '20', 10) || 20));
    return this.adminService.listOrganizations({
      page,
      limit,
      search: query.search,
      status: query.status ?? 'ALL',
    });
  }

  @Get('organizations/:id')
  getOrganization(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getOrganization(id);
  }

  @Patch('organizations/:id/plan')
  setPlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AdminSetPlanDto,
  ) {
    return this.adminService.setOrganizationPlan(id, body.planId, body.billingCycle);
  }

  @Post('organizations/:id/suspend')
  suspend(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AdminSuspendOrganizationDto,
  ) {
    return this.adminService.suspendOrganization(id, body.reason);
  }

  @Post('organizations/:id/unsuspend')
  unsuspend(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.unsuspendOrganization(id);
  }

  @Delete('organizations/:id')
  deleteOrganization(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.deleteOrganizationPermanently(id);
  }

  @Delete('users/:id')
  deleteUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.deleteUserCompletely(id);
  }

  @Patch('users/:id/active')
  setUserActive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AdminSetUserActiveDto,
  ): Promise<UserResponseDto | null> {
    return this.adminService
      .setUserActive(id, body.active)
      .then((user) => (user ? toUserDto(user) : null));
  }
}
