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
exports.SSOConfigRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const sso_config_entity_1 = require("../entities/sso-config.entity");
const uuid_util_1 = require("../../../common/utils/uuid.util");
let SSOConfigRepository = class SSOConfigRepository {
    constructor(repo) {
        this.repo = repo;
    }
    async findByOrganization(organizationId) {
        return this.repo.findOne({ where: { organizationId } });
    }
    async upsert(organizationId, data) {
        const existing = await this.findByOrganization(organizationId);
        if (existing) {
            Object.assign(existing, data);
            return this.repo.save(existing);
        }
        const entity = this.repo.create({
            ...data,
            id: (0, uuid_util_1.generateUuid)(),
            organizationId,
        });
        return this.repo.save(entity);
    }
    async remove(organizationId) {
        await this.repo.delete({ organizationId });
    }
};
exports.SSOConfigRepository = SSOConfigRepository;
exports.SSOConfigRepository = SSOConfigRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(sso_config_entity_1.SSOConfigEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], SSOConfigRepository);
//# sourceMappingURL=sso-config.repository.js.map