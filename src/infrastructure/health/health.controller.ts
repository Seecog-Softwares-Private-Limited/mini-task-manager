import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { Public } from '../../common/decorators/public.decorator';
import { PushNotificationsService } from '../../modules/notifications/push-notifications.service';

@Controller('health')
@SkipThrottle({ default: true, auth: true })
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private push: PushNotificationsService,
  ) {}

  @Get()
  @Public()
  async check() {
    const result = await this.health.check([() => this.db.pingCheck('database')]);
    return {
      ...result,
      push: {
        firebaseAdminReady: this.push.isReady(),
        note: this.push.isReady()
          ? 'FCM sends enabled'
          : 'FCM disabled — place config/firebase-service-account.json on the API host (or set FIREBASE_SERVICE_ACCOUNT_JSON) and restart PM2',
      },
    };
  }
}
