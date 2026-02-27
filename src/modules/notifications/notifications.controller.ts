import { Controller, Get, Patch, Param, Post, Query, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUserId } from '../../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../common/pagination';

@Controller('notifications')
@SkipThrottle({ auth: true })
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async findAll(
    @CurrentUserId() userId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.notificationsService.findByUser(userId, query);
  }

  @Patch(':id/read')
  async markAsRead(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
  ): Promise<{ message: string }> {
    await this.notificationsService.markAsRead(id, userId);
    return { message: 'OK' };
  }

  @Post('read-all')
  async markAllAsRead(@CurrentUserId() userId: string): Promise<{ count: number }> {
    return this.notificationsService.markAllAsRead(userId);
  }
}
