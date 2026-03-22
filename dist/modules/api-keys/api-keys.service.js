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
exports.ApiKeysService = void 0;
const common_1 = require("@nestjs/common");
const api_keys_repository_1 = require("./api-keys.repository");
const organizations_service_1 = require("../organizations/organizations.service");
const usage_service_1 = require("../billing/usage.service");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const KEY_PREFIX = 'mtm_';
const KEY_BYTES = 32;
let ApiKeysService = class ApiKeysService {
    constructor(apiKeysRepository, organizationsService, usageService) {
        this.apiKeysRepository = apiKeysRepository;
        this.organizationsService = organizationsService;
        this.usageService = usageService;
    }
    async listByOrganization(organizationId, userId) {
        const canAccess = await this.organizationsService.canAccess(organizationId, userId);
        if (!canAccess)
            throw new common_1.ForbiddenException('You do not have access to this organization');
        return this.apiKeysRepository.findByOrganization(organizationId);
    }
    async create(organizationId, userId, name) {
        const canAccess = await this.organizationsService.canAccess(organizationId, userId);
        if (!canAccess)
            throw new common_1.ForbiddenException('You do not have access to this organization');
        const features = await this.usageService.getFeatureFlags(organizationId);
        if (!features.apiEnabled) {
            throw new common_1.ForbiddenException('API access is not available on your plan. Upgrade to Pro or Enterprise to create API keys.');
        }
        const rawKey = KEY_PREFIX + crypto.randomBytes(KEY_BYTES).toString('base64url');
        const keyHash = await bcrypt.hash(rawKey, 10);
        const keyPrefix = rawKey.slice(0, 6) + '••••••' + rawKey.slice(-3);
        const apiKey = await this.apiKeysRepository.create({
            organizationId,
            name: name.trim().slice(0, 100),
            keyHash,
            keyPrefix,
            createdBy: userId,
        });
        return {
            id: apiKey.id,
            organizationId: apiKey.organizationId,
            name: apiKey.name,
            keyPrefix: apiKey.keyPrefix,
            lastUsedAt: apiKey.lastUsedAt,
            createdAt: apiKey.createdAt,
            rawKey,
        };
    }
    async revoke(id, organizationId, userId) {
        const canAccess = await this.organizationsService.canAccess(organizationId, userId);
        if (!canAccess)
            throw new common_1.ForbiddenException('You do not have access to this organization');
        const key = await this.apiKeysRepository.findById(id);
        if (!key || key.organizationId !== organizationId)
            throw new common_1.NotFoundException('API key not found');
        await this.apiKeysRepository.delete(id);
    }
};
exports.ApiKeysService = ApiKeysService;
exports.ApiKeysService = ApiKeysService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [api_keys_repository_1.ApiKeysRepository,
        organizations_service_1.OrganizationsService,
        usage_service_1.UsageService])
], ApiKeysService);
//# sourceMappingURL=api-keys.service.js.map