import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { NotificationsRepository } from './repositories/notifications.repository';
import { PaginationQueryDto, PaginatedResult, paginate } from '../../common/pagination';
import { PushNotificationsService } from './push-notifications.service';
import { formatUuid } from '../../common/utils/uuid.util';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly pushNotifications: PushNotificationsService,
  ) {}

  async findByUser(userId: string, query: PaginationQueryDto): Promise<PaginatedResult<import('./entities/notification.entity').NotificationEntity>> {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const [data, total] = await this.notificationsRepository.findByUser(userId, page, limit);
    return paginate(data, total, page, limit);
  }

  async markAsRead(id: string, userId: string): Promise<void> {
    const notification = await this.notificationsRepository.findById(id);
    if (!notification || notification.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }
    await this.notificationsRepository.markAsRead(id);
  }

  async markAllAsRead(userId: string): Promise<{ count: number }> {
    const count = await this.notificationsRepository.markAllAsReadByUser(userId);
    return { count };
  }

  /**
   * Persist in-app notification and push to all registered Android/iOS devices.
   * Optional `data` is delivered to FCM for deep-link / client routing.
   */
  async createNotification(
    userId: string,
    title: string,
    message: string,
    data?: Record<string, string>,
  ): Promise<void> {
    const normalizedUserId = formatUuid(userId) ?? userId;

    await this.notificationsRepository.create({
      userId: normalizedUserId,
      title,
      message,
      data: data && Object.keys(data).length > 0 ? data : null,
    });

    // Await so assignment flows reliably reach every registered device.
    // sendToUser never throws; invalid tokens are cleaned up inside.
    try {
      await this.pushNotifications.sendToUser(
        normalizedUserId,
        title || 'Notification',
        message || '',
        data,
      );
    } catch (err) {
      this.logger.error(
        `Unexpected push failure for user ${normalizedUserId}: ${
          err instanceof Error ? err.message : err
        }`,
      );
    }
  }
}
