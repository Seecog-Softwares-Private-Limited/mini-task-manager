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
exports.SprintsService = void 0;
const common_1 = require("@nestjs/common");
const sprints_repository_1 = require("./repositories/sprints.repository");
const projects_service_1 = require("../projects/projects.service");
let SprintsService = class SprintsService {
    constructor(sprintsRepository, projectsService) {
        this.sprintsRepository = sprintsRepository;
        this.projectsService = projectsService;
    }
    async findById(id) {
        return this.sprintsRepository.findById(id);
    }
    async findByIdInOrganization(id, organizationId) {
        const sprint = await this.sprintsRepository.findById(id);
        if (!sprint)
            return null;
        const project = await this.projectsService.findByIdInOrganization(sprint.projectId, organizationId);
        if (!project)
            return null;
        return sprint;
    }
    async findByProject(projectId, organizationId) {
        const project = await this.projectsService.findByIdInOrganization(projectId, organizationId);
        if (!project)
            return [];
        return this.sprintsRepository.findByProject(projectId);
    }
    async create(projectId, dto) {
        return this.sprintsRepository.create({
            projectId,
            name: dto.name,
            startDate: dto.startDate ? new Date(dto.startDate) : null,
            endDate: dto.endDate ? new Date(dto.endDate) : null,
            status: dto.status ?? 'PLANNED',
        });
    }
};
exports.SprintsService = SprintsService;
exports.SprintsService = SprintsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [sprints_repository_1.SprintsRepository,
        projects_service_1.ProjectsService])
], SprintsService);
//# sourceMappingURL=sprints.service.js.map