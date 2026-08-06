import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { NotificationsModule } from '../../modules/notifications/notifications.module';
import { HealthController } from './health.controller';

@Module({
  imports: [TerminusModule, NotificationsModule],
  controllers: [HealthController],
})
export class HealthModule {}
