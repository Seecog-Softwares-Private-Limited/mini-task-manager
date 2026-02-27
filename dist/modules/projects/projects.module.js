"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const auth_module_1 = require("../auth/auth.module");
const organizations_module_1 = require("../organizations/organizations.module");
const workflows_module_1 = require("../workflows/workflows.module");
const tasks_module_1 = require("../tasks/tasks.module");
const billing_module_1 = require("../billing/billing.module");
const activity_logs_module_1 = require("../activity-logs/activity-logs.module");
const notifications_module_1 = require("../notifications/notifications.module");
const project_entity_1 = require("./entities/project.entity");
const project_member_entity_1 = require("./entities/project-member.entity");
const projects_repository_1 = require("./repositories/projects.repository");
const project_members_repository_1 = require("./repositories/project-members.repository");
const projects_service_1 = require("./projects.service");
const projects_controller_1 = require("./projects.controller");
let ProjectsModule = class ProjectsModule {
};
exports.ProjectsModule = ProjectsModule;
exports.ProjectsModule = ProjectsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([project_entity_1.ProjectEntity, project_member_entity_1.ProjectMemberEntity]),
            auth_module_1.AuthModule,
            organizations_module_1.OrganizationsModule,
            (0, common_1.forwardRef)(() => workflows_module_1.WorkflowsModule),
            (0, common_1.forwardRef)(() => tasks_module_1.TasksModule),
            (0, common_1.forwardRef)(() => billing_module_1.BillingModule),
            activity_logs_module_1.ActivityLogsModule,
            notifications_module_1.NotificationsModule,
        ],
        controllers: [projects_controller_1.ProjectsController],
        providers: [projects_repository_1.ProjectsRepository, project_members_repository_1.ProjectMembersRepository, projects_service_1.ProjectsService],
        exports: [projects_service_1.ProjectsService, projects_repository_1.ProjectsRepository],
    })
], ProjectsModule);
//# sourceMappingURL=projects.module.js.map