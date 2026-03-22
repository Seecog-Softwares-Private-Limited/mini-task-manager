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
exports.TasksRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const pagination_1 = require("../../../common/pagination");
const uuid_util_1 = require("../../../common/utils/uuid.util");
const task_entity_1 = require("../entities/task.entity");
let TasksRepository = class TasksRepository {
    constructor(repo) {
        this.repo = repo;
    }
    async findById(id) {
        return this.repo.findOne({ where: { id } });
    }
    async findByIdAndOrganization(id, organizationId) {
        return this.repo.findOne({ where: { id, organizationId } });
    }
    async findByProject(projectId, page, limit) {
        return this.repo.findAndCount({
            where: { projectId },
            order: { createdAt: 'DESC' },
            skip: (0, pagination_1.getSkip)(page, limit),
            take: limit,
        });
    }
    async countByProject(projectId) {
        return this.repo.count({ where: { projectId } });
    }
    async countByOrganization(organizationId) {
        return this.repo.count({ where: { organizationId } });
    }
    async create(data) {
        const id = data.id ?? (0, uuid_util_1.generateUuid)();
        const payload = { ...data, id };
        if (payload.statusId === undefined || payload.statusId === '') {
            payload.statusId = null;
        }
        const entity = this.repo.create(payload);
        return this.repo.save(entity);
    }
    async update(id, data) {
        await this.repo.update(id, data);
    }
};
exports.TasksRepository = TasksRepository;
exports.TasksRepository = TasksRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(task_entity_1.TaskEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], TasksRepository);
//# sourceMappingURL=tasks.repository.js.map