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
exports.UserAvatarController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const throttler_1 = require("@nestjs/throttler");
const users_service_1 = require("./users.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
function toUserDto(user) {
    return {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        avatarUrl: user.avatarUrl ?? undefined,
        isEmailVerified: user.isEmailVerified,
        isActive: user.isActive,
    };
}
let UserAvatarController = class UserAvatarController {
    constructor(usersService) {
        this.usersService = usersService;
    }
    async uploadMyAvatar(userId, file) {
        if (!file?.buffer) {
            throw new common_1.BadRequestException('file is required');
        }
        const updated = await this.usersService.uploadAvatar(userId, file);
        return toUserDto(updated);
    }
    async deleteMyAvatar(userId) {
        await this.usersService.clearAvatar(userId);
        return { success: true };
    }
};
exports.UserAvatarController = UserAvatarController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { limits: { fileSize: 2 * 1024 * 1024 } })),
    __param(0, (0, current_user_decorator_1.CurrentUserId)()),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UserAvatarController.prototype, "uploadMyAvatar", null);
__decorate([
    (0, common_1.Delete)(),
    __param(0, (0, current_user_decorator_1.CurrentUserId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UserAvatarController.prototype, "deleteMyAvatar", null);
exports.UserAvatarController = UserAvatarController = __decorate([
    (0, common_1.Controller)('users/me/avatar'),
    (0, throttler_1.SkipThrottle)({ auth: true }),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], UserAvatarController);
//# sourceMappingURL=user-avatar.controller.js.map