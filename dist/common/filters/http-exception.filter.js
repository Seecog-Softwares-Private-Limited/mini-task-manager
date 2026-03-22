"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var GlobalExceptionFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
let GlobalExceptionFilter = GlobalExceptionFilter_1 = class GlobalExceptionFilter {
    constructor() {
        this.logger = new common_1.Logger(GlobalExceptionFilter_1.name);
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const isDev = process.env.NODE_ENV !== 'production';
        let status;
        let body;
        if (exception instanceof common_1.HttpException) {
            status = exception.getStatus();
            const message = exception.getResponse();
            body =
                typeof message === 'object' && message !== null
                    ? { ...message, statusCode: status }
                    : { message, statusCode: status };
        }
        else if (exception instanceof typeorm_1.QueryFailedError && isDev) {
            status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
            const driver = exception.driverError;
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
        }
        else {
            status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
            body = { statusCode: status, message: 'Internal server error' };
        }
        if (status >= 500) {
            this.logger.error(`${request.method} ${request.url} ${status}`, exception instanceof Error ? exception.stack : String(exception));
        }
        if (response.headersSent)
            return;
        response.status(status).json(body);
    }
};
exports.GlobalExceptionFilter = GlobalExceptionFilter;
exports.GlobalExceptionFilter = GlobalExceptionFilter = GlobalExceptionFilter_1 = __decorate([
    (0, common_1.Catch)()
], GlobalExceptionFilter);
//# sourceMappingURL=http-exception.filter.js.map