import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Http');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const method = req.method;
    const path = req.path ?? req.url?.split('?')[0] ?? req.url;
    const now = Date.now();
    const isProduction = process.env.NODE_ENV === 'production';

    return next.handle().pipe(
      tap(() => {
        const ms = Date.now() - now;
        if (isProduction) {
          this.logger.log(
            JSON.stringify({
              level: 'info',
              method,
              path,
              handler: context.getHandler().name,
              durationMs: ms,
            }),
          );
        } else {
          this.logger.log(`${method} ${path} ${context.getHandler().name} ${ms}ms`);
        }
      }),
    );
  }
}
