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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityLogsController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const roles_guard_1 = require("../auth/guards/roles.guard");
const activity_logs_service_1 = require("./activity-logs.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const tenant_guard_1 = require("../auth/guards/tenant.guard");
const tenant_decorator_1 = require("../../common/decorators/tenant.decorator");
const pagination_1 = require("../../common/pagination");
function toResponseItem(entity) {
    return {
        id: entity.id,
        organizationId: entity.organizationId,
        userId: entity.userId,
        entityType: entity.entityType,
        entityId: entity.entityId,
        action: entity.action,
        metadata: entity.metadata,
        createdAt: entity.createdAt,
        user: entity.user ? { fullName: entity.user.fullName, email: entity.user.email } : null,
    };
}
let ActivityLogsController = class ActivityLogsController {
    constructor(activityLogsService) {
        this.activityLogsService = activityLogsService;
    }
    async findAll(tenantId, query) {
        const result = await this.activityLogsService.findByOrganization(tenantId, query);
        return {
            ...result,
            data: result.data.map((e) => toResponseItem(e)),
        };
    }
};
exports.ActivityLogsController = ActivityLogsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, pagination_1.PaginationQueryDto]),
    __metadata("design:returntype", Promise)
], ActivityLogsController.prototype, "findAll", null);
exports.ActivityLogsController = ActivityLogsController = __decorate([
    (0, common_1.Controller)('activity-logs'),
    (0, throttler_1.SkipThrottle)({ auth: true }),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, tenant_guard_1.TenantGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('owner', 'admin'),
    __metadata("design:paramtypes", [activity_logs_service_1.ActivityLogsService])
], ActivityLogsController);
//# sourceMappingURL=activity-logs.controller.js.map