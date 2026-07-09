import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { Configuration } from '../../config/configuration';

/**
 * Registers global rate limiting asynchronously.
 * Throttling limits are resolved from ConfigService, which can be overridden in tests.
 */
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<Configuration>) => {
        const auth = config.get('throttle.auth', { infer: true })!;
        const general = config.get('throttle.general', { infer: true })!;
        return {
          throttlers: [
            { name: 'auth', limit: auth.limit, ttl: auth.ttl },
            { name: 'default', limit: general.limit, ttl: general.ttl },
          ],
          getTracker: (req: { ip?: string; user?: { userId: string } }) =>
            req.user?.userId ?? req.ip ?? 'unknown',
        };
      },
    }),
  ],
})
export class ThrottleModule {}
