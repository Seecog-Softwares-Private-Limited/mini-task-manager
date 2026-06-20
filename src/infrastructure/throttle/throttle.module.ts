import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';

/**
 * Rate limiting is disabled application-wide (no ThrottlerGuard in AppModule).
 * This module is kept only so @SkipThrottle decorators remain valid if throttling is re-enabled later.
 */
@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        { name: 'auth', limit: 1_000_000, ttl: 60_000 },
        { name: 'default', limit: 1_000_000, ttl: 60_000 },
      ],
    }),
  ],
})
export class ThrottleModule {}
