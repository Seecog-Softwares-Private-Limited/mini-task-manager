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
exports.OrganizationMembersRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const uuid_util_1 = require("../../../common/utils/uuid.util");
const organization_member_entity_1 = require("../entities/organization-member.entity");
let OrganizationMembersRepository = class OrganizationMembersRepository {
    constructor(repo) {
        this.repo = repo;
    }
    async findByOrganizationAndUser(organizationId, userId) {
        return this.repo.findOne({
            where: { organizationId, userId, status: 'ACTIVE' },
        });
    }
    async findByOrganization(organizationId) {
        return this.repo.find({ where: { organizationId }, order: { joinedAt: 'ASC' } });
    }
    async countByOrganization(organizationId) {
        return this.repo.count({ where: { organizationId, status: 'ACTIVE' } });
    }
    async findByOrganizationWithUser(organizationId) {
        return this.repo.find({
            where: { organizationId, status: 'ACTIVE' },
            order: { joinedAt: 'ASC' },
            relations: ['user'],
        });
    }
    async findByUser(userId) {
        return this.repo.find({
            where: { userId, status: 'ACTIVE' },
            order: { joinedAt: 'ASC' },
        });
    }
    async findById(id) {
        return this.repo.findOne({
            where: { id },
            relations: ['user'],
        });
    }
    async create(data) {
        const id = data.id ?? (0, uuid_util_1.generateUuid)();
        const entity = this.repo.create({ ...data, id });
        return this.repo.save(entity);
    }
    async update(id, data) {
        await this.repo.update(id, data);
    }
};
exports.OrganizationMembersRepository = OrganizationMembersRepository;
exports.OrganizationMembersRepository = OrganizationMembersRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(organization_member_entity_1.OrganizationMemberEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], OrganizationMembersRepository);
//# sourceMappingURL=organization-members.repository.js.map