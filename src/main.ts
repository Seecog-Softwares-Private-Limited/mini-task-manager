import './bootstrap-env';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { Configuration } from './config/configuration';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService<Configuration>);
  const nodeEnv = config.get('nodeEnv', { infer: true }) ?? 'development';
  const apiPrefix = config.get('apiPrefix', { infer: true }) ?? 'api/v1';

  app.setGlobalPrefix(apiPrefix, { exclude: ['/'] });

  // In development, reflect the browser Origin so Next (:3008), Flutter web (:8090), etc. all work.
  // In production, use CORS_ORIGIN from env (set by resolve-env-urls from properties.env).
  const isProduction = nodeEnv === 'production';
  const corsOrigin =
    isProduction && process.env.CORS_ORIGIN?.trim()
      ? process.env.CORS_ORIGIN.trim()
      : true;
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Organization-Id'],
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
