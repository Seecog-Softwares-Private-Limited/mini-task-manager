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
exports.TenantGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const public_decorator_1 = require("../../../common/decorators/public.decorator");
const organization_members_repository_interface_1 = require("../../organizations/repositories/organization-members.repository.interface");
let TenantGuard = class TenantGuard {
    constructor(reflector, orgMembersRepo) {
        this.reflector = reflector;
        this.orgMembersRepo = orgMembersRepo;
    }
    async canActivate(context) {
        const isPublic = this.reflector.getAllAndOverride(public_decorator_1.IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic)
            return true;
        const request = context.switchToHttp().getRequest();
        const userId = request.user?.userId;
        const orgId = request.headers['x-organization-id'];
        if (!orgId)
            return false;
        const membership = await this.orgMembersRepo.findByOrganizationAndUser(orgId, userId);
        if (!membership)
            return false;
        request.tenantId = orgId;
        if (request.user) {
            const user = request.user;
            user.orgRole = membership.role;
            user.roles = [membership.role];
        }
        return true;
    }
};
exports.TenantGuard = TenantGuard;
exports.TenantGuard = TenantGuard = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(organization_members_repository_interface_1.ORGANIZATION_MEMBERS_REPOSITORY)),
    __metadata("design:paramtypes", [core_1.Reflector, Object])
], TenantGuard);
//# sourceMappingURL=tenant.guard.js.map