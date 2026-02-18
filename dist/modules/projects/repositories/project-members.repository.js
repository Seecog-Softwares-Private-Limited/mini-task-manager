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
exports.ProjectMembersRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const uuid_util_1 = require("../../../common/utils/uuid.util");
const project_member_entity_1 = require("../entities/project-member.entity");
let ProjectMembersRepository = class ProjectMembersRepository {
    constructor(repo) {
        this.repo = repo;
    }
    async findByProject(projectId) {
        return this.repo.find({ where: { projectId } });
    }
    async findByProjectWithUser(projectId) {
        return this.repo.find({
            where: { projectId },
            relations: ['user'],
            order: { id: 'ASC' },
        });
    }
    async findByProjectAndUser(projectId, userId) {
        return this.repo.findOne({ where: { projectId, userId } });
    }
    async create(data) {
        const id = data.id ?? (0, uuid_util_1.generateUuid)();
        const entity = this.repo.create({ ...data, id });
        return this.repo.save(entity);
    }
    async updateRole(id, role) {
        await this.repo.update(id, { role });
    }
    async delete(id) {
        await this.repo.delete(id);
    }
    async findById(id) {
        return this.repo.findOne({ where: { id }, relations: ['user'] });
    }
};
exports.ProjectMembersRepository = ProjectMembersRepository;
exports.ProjectMembersRepository = ProjectMembersRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(project_member_entity_1.ProjectMemberEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], ProjectMembersRepository);
//# sourceMappingURL=project-members.repository.js.map