import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const isDev = process.env.NODE_ENV !== 'production';

    let status: number;
    let body: Record<string, unknown>;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const message = exception.getResponse();
      body =
        typeof message === 'object' && message !== null
          ? { ...(message as object), statusCode: status }
          : { message, statusCode: status };
    } else if (exception instanceof QueryFailedError && isDev) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      const driver = exception.driverError as { sqlMessage?: string; code?: string } | undefined;
      const sqlMessage = driver?.sqlMessage ?? exception.message;
      let hint = '';
      if (/icon_url|Unknown column.*projects/i.test(sqlMessage)) {
        hint =
          ' Fix: from repo root run `npm run migration:run` or `npm run db:ensure-project-icon-url`, then restart the API.';
      }
      body = {
        statusCode: status,
        error: 'DatabaseError',
        message: `${sqlMessage}${hint}`,
        detail: sqlMessage,
      };
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      body = { statusCode: status, message: 'Internal server error' };
    }

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    if (response.headersSent) return;
    response.status(status).json(body);
  }
}
