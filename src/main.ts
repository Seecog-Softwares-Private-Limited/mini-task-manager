import './bootstrap-env';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { Configuration } from './config/configuration';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  // Larger JSON limit so local→VPS upload mirroring can send base64 blobs (~10MB files).
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(json({ limit: '15mb' }));
  app.use(urlencoded({ extended: true, limit: '15mb' }));
  const config = app.get(ConfigService<Configuration>);
  const nodeEnv = config.get('nodeEnv', { infer: true }) ?? 'development';
  const apiPrefix = config.get('apiPrefix', { infer: true }) ?? 'api/v1';

  app.setGlobalPrefix(apiPrefix, { exclude: ['/'] });

  // In development, reflect any Origin (Next, Flutter web, etc.).
  // In production, allow CORS_ORIGIN (comma-separated) plus local Flutter web origins.
  const isProduction = nodeEnv === 'production';
  const configuredOrigins = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const corsOrigin = isProduction
    ? (
        origin: string | undefined,
        callback: (err: Error | null, allow?: boolean) => void,
      ) => {
        if (!origin) {
          callback(null, true);
          return;
        }
        const isLocalFlutterWeb =
          /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
        if (isLocalFlutterWeb || configuredOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(null, false);
      }
    : true;
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Organization-Id',
      'X-Uploads-Mirror-Secret',
    ],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  app.enableShutdownHooks();

  const port = config.get('port', { infer: true }) ?? 3000;
  const db = config.get('database', { infer: true });
  await app.listen(port);

  logger.log(`Listening on port ${port} (prefix=${apiPrefix}, NODE_ENV=${nodeEnv})`);
  logger.log(`Database: ${db?.host ?? 'localhost'}:${db?.port ?? 3306} / ${db?.database ?? 'mini_task_manager'}`);
  return { app, port };
}

bootstrap()
  .then(({ port }) => {
    if (process.env.NODE_ENV !== 'production') {
      logger.log(`Application is running on: http://localhost:${port}`);
    }
  })
  .catch((err) => {
    logger.error('Failed to start application', err instanceof Error ? err.stack : String(err));
    process.exit(1);
  });
