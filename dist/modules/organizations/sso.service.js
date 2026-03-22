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
exports.SSOService = void 0;
const common_1 = require("@nestjs/common");
const sso_config_repository_1 = require("./repositories/sso-config.repository");
const usage_service_1 = require("../billing/usage.service");
let SSOService = class SSOService {
    constructor(ssoConfigRepo, usageService) {
        this.ssoConfigRepo = ssoConfigRepo;
        this.usageService = usageService;
    }
    toResponse(entity) {
        return {
            id: entity.id,
            organizationId: entity.organizationId,
            provider: entity.provider,
            label: entity.label,
            issuerUrl: entity.issuerUrl,
            ssoUrl: entity.ssoUrl,
            clientId: entity.clientId,
            metadataUrl: entity.metadataUrl,
            domains: entity.domains,
            isEnabled: entity.isEnabled,
            createdAt: entity.createdAt,
            updatedAt: entity.updatedAt,
        };
    }
    async assertSSOAllowed(organizationId) {
        const flags = await this.usageService.getFeatureFlags(organizationId);
        if (!flags.sso) {
            throw new common_1.ForbiddenException({
                statusCode: 403,
                error: 'FEATURE_NOT_AVAILABLE',
                code: 'SSO_NOT_AVAILABLE',
                message: 'SSO is not available on your current plan. Upgrade to Pro or Enterprise to enable SSO.',
                upgradeUrl: '/dashboard/billing',
            });
        }
    }
    async getConfig(organizationId) {
        const entity = await this.ssoConfigRepo.findByOrganization(organizationId);
        return entity ? this.toResponse(entity) : null;
    }
    async upsertConfig(organizationId, dto) {
        await this.assertSSOAllowed(organizationId);
        const entity = await this.ssoConfigRepo.upsert(organizationId, {
            provider: dto.provider,
            label: dto.label ?? null,
            issuerUrl: dto.issuerUrl ?? null,
            ssoUrl: dto.ssoUrl ?? null,
            clientId: dto.clientId ?? null,
            clientSecret: dto.clientSecret ?? null,
            certificate: dto.certificate ?? null,
            metadataUrl: dto.metadataUrl ?? null,
            domains: dto.domains ?? null,
            isEnabled: dto.isEnabled ?? false,
        });
        return this.toResponse(entity);
    }
    async deleteConfig(organizationId) {
        const existing = await this.ssoConfigRepo.findByOrganization(organizationId);
        if (!existing) {
            throw new common_1.NotFoundException('No SSO configuration found for this organization.');
        }
        await this.ssoConfigRepo.remove(organizationId);
    }
    async toggleEnabled(organizationId, enabled) {
        await this.assertSSOAllowed(organizationId);
        const existing = await this.ssoConfigRepo.findByOrganization(organizationId);
        if (!existing) {
            throw new common_1.NotFoundException('No SSO configuration found. Create one first.');
        }
        const updated = await this.ssoConfigRepo.upsert(organizationId, {
            isEnabled: enabled,
        });
        return this.toResponse(updated);
    }
};
exports.SSOService = SSOService;
exports.SSOService = SSOService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => usage_service_1.UsageService))),
    __metadata("design:paramtypes", [sso_config_repository_1.SSOConfigRepository,
        usage_service_1.UsageService])
], SSOService);
//# sourceMappingURL=sso.service.js.map