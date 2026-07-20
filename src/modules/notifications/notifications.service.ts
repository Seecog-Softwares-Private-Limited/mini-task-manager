import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationsRepository } from './repositories/notifications.repository';
import { PaginationQueryDto, PaginatedResult, paginate } from '../../common/pagination';
import { PushNotificationsService } from './push-notifications.service';

@Injectable()
export class NotificationsService {
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
    await this.notificationsRepository.create({ userId, title, message });

    // Await so assignment flows reliably reach devices before the request ends.
    // sendToUser never throws; invalid tokens are cleaned up inside.
    await this.pushNotifications.sendToUser(
      userId,
      title || 'Notification',
      message || '',
      data,
    );
  }
}
