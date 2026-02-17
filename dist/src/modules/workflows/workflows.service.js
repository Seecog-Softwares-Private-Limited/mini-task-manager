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
exports.WorkflowsService = void 0;
const common_1 = require("@nestjs/common");
const workflows_repository_1 = require("./repositories/workflows.repository");
const workflow_statuses_repository_1 = require("./repositories/workflow-statuses.repository");
const projects_service_1 = require("../projects/projects.service");
let WorkflowsService = class WorkflowsService {
    constructor(workflowsRepository, workflowStatusesRepository, projectsService) {
        this.workflowsRepository = workflowsRepository;
        this.workflowStatusesRepository = workflowStatusesRepository;
        this.projectsService = projectsService;
    }
    async findById(id) {
        return this.workflowsRepository.findById(id);
    }
    async findByIdInOrganization(id, organizationId) {
        const workflow = await this.workflowsRepository.findById(id);
        if (!workflow)
            return null;
        const project = await this.projectsService.findByIdInOrganization(workflow.projectId, organizationId);
        if (!project)
            return null;
        return workflow;
    }
    async findByProject(projectId, organizationId) {
        const project = await this.projectsService.findByIdInOrganization(projectId, organizationId);
        if (!project)
            return [];
        return this.workflowsRepository.findByProject(projectId);
    }
    async create(projectId, dto) {
        return this.workflowsRepository.create({
            projectId,
            name: dto.name,
            isDefault: dto.isDefault ?? true,
        });
    }
    async getStatuses(workflowId) {
        return this.workflowStatusesRepository.findByWorkflow(workflowId);
    }
};
exports.WorkflowsService = WorkflowsService;
exports.WorkflowsService = WorkflowsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [workflows_repository_1.WorkflowsRepository,
        workflow_statuses_repository_1.WorkflowStatusesRepository,
        projects_service_1.ProjectsService])
], WorkflowsService);
//# sourceMappingURL=workflows.service.js.map