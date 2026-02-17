"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const auth_module_1 = require("../auth/auth.module");
const organizations_module_1 = require("../organizations/organizations.module");
const projects_module_1 = require("../projects/projects.module");
const workflow_entity_1 = require("./entities/workflow.entity");
const workflow_status_entity_1 = require("./entities/workflow-status.entity");
const workflows_repository_1 = require("./repositories/workflows.repository");
const workflow_statuses_repository_1 = require("./repositories/workflow-statuses.repository");
const workflows_service_1 = require("./workflows.service");
const workflows_controller_1 = require("./workflows.controller");
let WorkflowsModule = class WorkflowsModule {
};
exports.WorkflowsModule = WorkflowsModule;
exports.WorkflowsModule = WorkflowsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([workflow_entity_1.WorkflowEntity, workflow_status_entity_1.WorkflowStatusEntity]),
            auth_module_1.AuthModule,
            organizations_module_1.OrganizationsModule,
            projects_module_1.ProjectsModule,
        ],
        controllers: [workflows_controller_1.WorkflowsController],
        providers: [workflows_repository_1.WorkflowsRepository, workflow_statuses_repository_1.WorkflowStatusesRepository, workflows_service_1.WorkflowsService],
        exports: [workflows_service_1.WorkflowsService, workflows_repository_1.WorkflowsRepository, workflow_statuses_repository_1.WorkflowStatusesRepository],
    })
], WorkflowsModule);
//# sourceMappingURL=workflows.module.js.map