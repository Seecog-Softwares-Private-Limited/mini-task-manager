"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const check_limit_decorator_1 = require("../decorators/check-limit.decorator");
const usage_service_1 = require("../usage.service");
let SubscriptionGuard = class SubscriptionGuard {
    constructor(reflector, usageService) {
        this.reflector = reflector;
        this.usageService = usageService;
    }
    async canActivate(context) {
        const resource = this.reflector.getAllAndOverride(check_limit_decorator_1.CHECK_LIMIT_KEY, [context.getHandler(), context.getClass()]);
        if (!resource)
            return true;
        const request = context.switchToHttp().getRequest();
        let organizationId = request.tenantId;
        if (!organizationId && request.params?.id && request.originalUrl?.includes('/organizations/')) {
            const paramId = request.params.id;
            organizationId = Array.isArray(paramId) ? paramId[0] : paramId;
        }
        if (!organizationId) {
            return true;
        }
        const result = await this.usageService.checkLimit(organizationId, resource);
        if (result.allowed)
            return true;
        throw new common_1.HttpException({
            statusCode: common_1.HttpStatus.FORBIDDEN,
            error: 'LIMIT_EXCEEDED',
            code: 'SUBSCRIPTION_LIMIT_EXCEEDED',
            resource: result.resource,
            current: result.current,
            limit: result.limit,
            message: result.message,
            upgradeUrl: '/dashboard/billing',
        }, common_1.HttpStatus.FORBIDDEN);
    }
};
exports.SubscriptionGuard = SubscriptionGuard;
exports.SubscriptionGuard = SubscriptionGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        usage_service_1.UsageService])
], SubscriptionGuard);
//# sourceMappingURL=subscription.guard.js.map