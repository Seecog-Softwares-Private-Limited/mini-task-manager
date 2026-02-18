"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomFieldsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const auth_module_1 = require("../auth/auth.module");
const organizations_module_1 = require("../organizations/organizations.module");
const projects_module_1 = require("../projects/projects.module");
const custom_field_entity_1 = require("./entities/custom-field.entity");
const task_custom_field_value_entity_1 = require("./entities/task-custom-field-value.entity");
const custom_fields_repository_1 = require("./repositories/custom-fields.repository");
const task_custom_field_values_repository_1 = require("./repositories/task-custom-field-values.repository");
const custom_fields_service_1 = require("./custom-fields.service");
const custom_fields_controller_1 = require("./custom-fields.controller");
let CustomFieldsModule = class CustomFieldsModule {
};
exports.CustomFieldsModule = CustomFieldsModule;
exports.CustomFieldsModule = CustomFieldsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([custom_field_entity_1.CustomFieldEntity, task_custom_field_value_entity_1.TaskCustomFieldValueEntity]),
            auth_module_1.AuthModule,
            organizations_module_1.OrganizationsModule,
            projects_module_1.ProjectsModule,
        ],
        controllers: [custom_fields_controller_1.CustomFieldsController],
        providers: [custom_fields_repository_1.CustomFieldsRepository, task_custom_field_values_repository_1.TaskCustomFieldValuesRepository, custom_fields_service_1.CustomFieldsService],
        exports: [custom_fields_service_1.CustomFieldsService, custom_fields_repository_1.CustomFieldsRepository],
    })
], CustomFieldsModule);
//# sourceMappingURL=custom-fields.module.js.map