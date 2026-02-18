import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { UsersRepository } from './repositories/users.repository';

/**
 * Updates the current user's last_seen_at on each authenticated request
 * so presence (online/offline) can be shown in the UI.
 * Runs after JwtAuthGuard; no-op when request.user is not set.
 */
@Injectable()
export class LastSeenInterceptor implements NestInterceptor {
  constructor(private readonly usersRepository: UsersRepository) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{ user?: { userId: string } }>();
    const userId = request.user?.userId;

    return next.handle().pipe(
      tap(() => {
        if (userId) {
          this.usersRepository.updateLastSeen(userId).catch(() => {
            // ignore errors (e.g. DB briefly unavailable)
          });
        }
      }),
    );
  }
}
