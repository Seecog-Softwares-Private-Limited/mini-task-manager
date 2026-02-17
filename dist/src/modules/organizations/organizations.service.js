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
exports.OrganizationsService = void 0;
const common_1 = require("@nestjs/common");
const organizations_repository_1 = require("./repositories/organizations.repository");
const organization_members_repository_1 = require("./repositories/organization-members.repository");
let OrganizationsService = class OrganizationsService {
    constructor(organizationsRepository, orgMembersRepository) {
        this.organizationsRepository = organizationsRepository;
        this.orgMembersRepository = orgMembersRepository;
    }
    async findById(id) {
        return this.organizationsRepository.findById(id);
    }
    async findBySlug(slug) {
        return this.organizationsRepository.findBySlug(slug);
    }
    async create(ownerId, dto) {
        const org = await this.organizationsRepository.create({
            name: dto.name,
            slug: dto.slug,
            ownerId,
        });
        await this.orgMembersRepository.create({
            organizationId: org.id,
            userId: ownerId,
            role: 'OWNER',
            status: 'ACTIVE',
        });
        return org;
    }
    async getMembers(organizationId) {
        return this.orgMembersRepository.findByOrganization(organizationId);
    }
    async canAccess(organizationId, userId) {
        const membership = await this.orgMembersRepository.findByOrganizationAndUser(organizationId, userId);
        return membership != null && membership.status === 'ACTIVE';
    }
};
exports.OrganizationsService = OrganizationsService;
exports.OrganizationsService = OrganizationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [organizations_repository_1.OrganizationsRepository,
        organization_members_repository_1.OrganizationMembersRepository])
], OrganizationsService);
//# sourceMappingURL=organizations.service.js.map