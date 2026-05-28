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
exports.WorkflowsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const workflows_repository_1 = require("./repositories/workflows.repository");
const workflow_statuses_repository_1 = require("./repositories/workflow-statuses.repository");
const projects_service_1 = require("../projects/projects.service");
const workflow_entity_1 = require("./entities/workflow.entity");
const workflow_status_entity_1 = require("./entities/workflow-status.entity");
const uuid_util_1 = require("../../common/utils/uuid.util");
const base_entity_1 = require("../../common/base.entity");
const task_entity_1 = require("../tasks/entities/task.entity");
const DEFAULT_STATUSES = [
    { name: 'To Do', position: 0, type: 'TODO' },
    { name: 'In Progress', position: 1, type: 'IN_PROGRESS' },
    { name: 'Done', position: 2, type: 'DONE' },
];
function asUuidString(value) {
    if (value == null)
        return null;
    if (Buffer.isBuffer(value)) {
        return base_entity_1.uuidBinaryTransformer.from(value);
    }
    const text = String(value).trim();
    return text.length > 0 ? text : null;
}
let WorkflowsService = class WorkflowsService {
    constructor(workflowsRepository, workflowStatusesRepository, projectsService, dataSource) {
        this.workflowsRepository = workflowsRepository;
        this.workflowStatusesRepository = workflowStatusesRepository;
        this.projectsService = projectsService;
        this.dataSource = dataSource;
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
    async createDefaultWorkflow(projectId, organizationId) {
        if (organizationId != null && organizationId !== '') {
            const project = await this.projectsService.findByIdInOrganization(projectId, organizationId);
            if (!project) {
                throw new common_1.NotFoundException('Project not found in this organization');
            }
        }
        return await this.dataSource.transaction(async (manager) => {
            const wfRepo = manager.getRepository(workflow_entity_1.WorkflowEntity);
            const stRepo = manager.getRepository(workflow_status_entity_1.WorkflowStatusEntity);
            const existing = await wfRepo.find({
                where: { projectId },
                order: { name: 'ASC' },
            });
            let workflow = existing.find((w) => !!w.isDefault);
            if (!workflow) {
                const workflowId = (0, uuid_util_1.generateUuid)();
                await wfRepo.insert({
                    id: workflowId,
                    projectId,
                    name: 'Default',
                    isDefault: true,
                });
                workflow = {
                    id: workflowId,
                    projectId,
                    name: 'Default',
                    isDefault: true,
                };
            }
            const workflowId = asUuidString(workflow.id);
            if (!workflowId) {
                throw new common_1.InternalServerErrorException('Default workflow could not be created');
            }
            workflow = { ...workflow, id: workflowId, projectId: asUuidString(workflow.projectId) ?? projectId };
            const currentStatuses = await stRepo.find({
                where: { workflowId: workflow.id },
                order: { position: 'ASC' },
            });
            if (currentStatuses.length === 0) {
                for (const s of DEFAULT_STATUSES) {
                    await stRepo.save(stRepo.create({
                        id: (0, uuid_util_1.generateUuid)(),
                        workflowId: workflow.id,
                        name: s.name,
                        position: s.position,
                        type: s.type,
                        color: null,
                    }));
                }
            }
            const statusesAfterSetup = await stRepo.find({
                where: { workflowId: workflow.id },
                order: { position: 'ASC' },
            });
            const defaultStatus = statusesAfterSetup.find((s) => s.type === 'TODO') ?? statusesAfterSetup[0];
            const defaultStatusId = asUuidString(defaultStatus?.id);
            if (defaultStatusId) {
                await manager
                    .createQueryBuilder()
                    .update(task_entity_1.TaskEntity)
                    .set({ statusId: defaultStatusId })
                    .where('project_id = :projectId', { projectId })
                    .andWhere('status_id IS NULL')
                    .execute();
            }
            return workflow;
        });
    }
};
exports.WorkflowsService = WorkflowsService;
exports.WorkflowsService = WorkflowsService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)((0, common_1.forwardRef)(() => projects_service_1.ProjectsService))),
    __param(3, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [workflows_repository_1.WorkflowsRepository,
        workflow_statuses_repository_1.WorkflowStatusesRepository,
        projects_service_1.ProjectsService,
        typeorm_2.DataSource])
], WorkflowsService);
//# sourceMappingURL=workflows.service.js.map