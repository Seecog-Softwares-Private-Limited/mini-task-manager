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

  app.setGlobalPrefix(apiPrefix);
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
  await app.listen(port);

  logger.log(`Listening on port ${port} (prefix=${apiPrefix}, NODE_ENV=${nodeEnv})`);
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
