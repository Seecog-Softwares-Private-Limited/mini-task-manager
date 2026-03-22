"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityLogsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const auth_module_1 = require("../auth/auth.module");
const organizations_module_1 = require("../organizations/organizations.module");
const activity_log_entity_1 = require("./entities/activity-log.entity");
const activity_logs_repository_1 = require("./repositories/activity-logs.repository");
const activity_logs_service_1 = require("./activity-logs.service");
const activity_logs_controller_1 = require("./activity-logs.controller");
let ActivityLogsModule = class ActivityLogsModule {
};
exports.ActivityLogsModule = ActivityLogsModule;
exports.ActivityLogsModule = ActivityLogsModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([activity_log_entity_1.ActivityLogEntity]), auth_module_1.AuthModule, organizations_module_1.OrganizationsModule],
        controllers: [activity_logs_controller_1.ActivityLogsController],
        providers: [activity_logs_repository_1.ActivityLogsRepository, activity_logs_service_1.ActivityLogsService],
        exports: [activity_logs_service_1.ActivityLogsService, activity_logs_repository_1.ActivityLogsRepository],
    })
], ActivityLogsModule);
//# sourceMappingURL=activity-logs.module.js.map