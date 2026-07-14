import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationEntity } from './entities/notification.entity';
import { DeviceTokenEntity } from './entities/device-token.entity';
import { NotificationsRepository } from './repositories/notifications.repository';
import { DeviceTokensRepository } from './repositories/device-tokens.repository';
import { NotificationsService } from './notifications.service';
import { PushNotificationsService } from './push-notifications.service';
import { NotificationsController } from './notifications.controller';
import { DeviceTokensController } from './device-tokens.controller';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationEntity, DeviceTokenEntity])],
  controllers: [NotificationsController, DeviceTokensController],
  providers: [
    NotificationsRepository,
    DeviceTokensRepository,
    NotificationsService,
    PushNotificationsService,
  ],
  exports: [NotificationsService, NotificationsRepository, PushNotificationsService],
})
export class NotificationsModule {}
