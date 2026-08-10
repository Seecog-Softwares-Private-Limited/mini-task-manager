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

    let status: number;
    let body: Record<string, unknown>;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const message = exception.getResponse();
      body =
        typeof message === 'object' && message !== null
          ? { ...(message as object), statusCode: status }
          : { message, statusCode: status };
    } else if (exception instanceof QueryFailedError) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      const driver = exception.driverError as
        | { sqlMessage?: string; code?: string }
        | undefined;
      const sqlMessage = driver?.sqlMessage ?? exception.message;
      this.logger.error(
        `${request.method} ${request.url} DatabaseError: ${sqlMessage}`,
        exception.stack,
      );
      body = {
        statusCode: status,
        message: 'Something went wrong. Please try again.',
      };
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      body = {
        statusCode: status,
        message: 'Something went wrong. Please try again.',
      };
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
