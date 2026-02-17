"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const throttler_1 = require("@nestjs/throttler");
const jwt_auth_guard_1 = require("./modules/auth/guards/jwt-auth.guard");
const config_module_1 = require("./config/config.module");
const database_module_1 = require("./infrastructure/database/database.module");
const health_module_1 = require("./infrastructure/health/health.module");
const throttle_module_1 = require("./infrastructure/throttle/throttle.module");
const auth_module_1 = require("./modules/auth/auth.module");
const users_module_1 = require("./modules/users/users.module");
const organizations_module_1 = require("./modules/organizations/organizations.module");
const projects_module_1 = require("./modules/projects/projects.module");
const workflows_module_1 = require("./modules/workflows/workflows.module");
const sprints_module_1 = require("./modules/sprints/sprints.module");
const tasks_module_1 = require("./modules/tasks/tasks.module");
const custom_fields_module_1 = require("./modules/custom-fields/custom-fields.module");
const notifications_module_1 = require("./modules/notifications/notifications.module");
const billing_module_1 = require("./modules/billing/billing.module");
const activity_logs_module_1 = require("./modules/activity-logs/activity-logs.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        providers: [
            { provide: core_1.APP_GUARD, useClass: jwt_auth_guard_1.JwtAuthGuard },
            { provide: core_1.APP_GUARD, useClass: throttler_1.ThrottlerGuard },
        ],
        imports: [
            config_module_1.ConfigModule,
            database_module_1.DatabaseModule,
            health_module_1.HealthModule,
            throttle_module_1.ThrottleModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            organizations_module_1.OrganizationsModule,
            projects_module_1.ProjectsModule,
            workflows_module_1.WorkflowsModule,
            sprints_module_1.SprintsModule,
            tasks_module_1.TasksModule,
            custom_fields_module_1.CustomFieldsModule,
            notifications_module_1.NotificationsModule,
            billing_module_1.BillingModule,
            activity_logs_module_1.ActivityLogsModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map