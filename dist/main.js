"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const app_module_1 = require("./app.module");
const http_exception_filter_1 = require("./common/filters/http-exception.filter");
const logging_interceptor_1 = require("./common/interceptors/logging.interceptor");
const logger = new common_1.Logger('Bootstrap');
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const config = app.get((config_1.ConfigService));
    const nodeEnv = config.get('nodeEnv', { infer: true }) ?? 'development';
    const apiPrefix = config.get('apiPrefix', { infer: true }) ?? 'api/v1';
    app.setGlobalPrefix(apiPrefix);
    const corsOrigin = process.env.CORS_ORIGIN ?? (nodeEnv === 'production' ? undefined : 'http://localhost:3001');
    app.enableCors({
        origin: corsOrigin ?? true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Organization-Id'],
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
    }));
    app.useGlobalFilters(new http_exception_filter_1.GlobalExceptionFilter());
    app.useGlobalInterceptors(new logging_interceptor_1.LoggingInterceptor());
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
//# sourceMappingURL=main.js.map