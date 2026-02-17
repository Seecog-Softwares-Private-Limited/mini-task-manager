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
exports.CustomFieldsService = void 0;
const common_1 = require("@nestjs/common");
const custom_fields_repository_1 = require("./repositories/custom-fields.repository");
const task_custom_field_values_repository_1 = require("./repositories/task-custom-field-values.repository");
const projects_service_1 = require("../projects/projects.service");
let CustomFieldsService = class CustomFieldsService {
    constructor(customFieldsRepository, taskCustomFieldValuesRepository, projectsService) {
        this.customFieldsRepository = customFieldsRepository;
        this.taskCustomFieldValuesRepository = taskCustomFieldValuesRepository;
        this.projectsService = projectsService;
    }
    async findByProject(projectId, organizationId) {
        const project = await this.projectsService.findByIdInOrganization(projectId, organizationId);
        if (!project)
            return [];
        return this.customFieldsRepository.findByProject(projectId);
    }
    async create(projectId, dto) {
        return this.customFieldsRepository.create({
            projectId,
            name: dto.name,
            fieldType: dto.fieldType,
            isRequired: dto.isRequired ?? false,
        });
    }
    async getValuesForTask(taskId) {
        return this.taskCustomFieldValuesRepository.findByTask(taskId);
    }
};
exports.CustomFieldsService = CustomFieldsService;
exports.CustomFieldsService = CustomFieldsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [custom_fields_repository_1.CustomFieldsRepository,
        task_custom_field_values_repository_1.TaskCustomFieldValuesRepository,
        projects_service_1.ProjectsService])
], CustomFieldsService);
//# sourceMappingURL=custom-fields.service.js.map