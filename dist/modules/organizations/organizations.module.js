"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganizationsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const auth_module_1 = require("../auth/auth.module");
const organization_entity_1 = require("./entities/organization.entity");
const organization_member_entity_1 = require("./entities/organization-member.entity");
const sso_config_entity_1 = require("./entities/sso-config.entity");
const organizations_repository_1 = require("./repositories/organizations.repository");
const organization_members_repository_1 = require("./repositories/organization-members.repository");
const organization_members_repository_interface_1 = require("./repositories/organization-members.repository.interface");
const sso_config_repository_1 = require("./repositories/sso-config.repository");
const organizations_service_1 = require("./organizations.service");
const organizations_controller_1 = require("./organizations.controller");
const sso_controller_1 = require("./sso.controller");
const sso_service_1 = require("./sso.service");
const billing_module_1 = require("../billing/billing.module");
let OrganizationsModule = class OrganizationsModule {
};
exports.OrganizationsModule = OrganizationsModule;
exports.OrganizationsModule = OrganizationsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([organization_entity_1.OrganizationEntity, organization_member_entity_1.OrganizationMemberEntity, sso_config_entity_1.SSOConfigEntity]),
            (0, common_1.forwardRef)(() => billing_module_1.BillingModule),
            (0, common_1.forwardRef)(() => auth_module_1.AuthModule),
        ],
        controllers: [organizations_controller_1.OrganizationsController, sso_controller_1.SSOController],
        providers: [
            organizations_repository_1.OrganizationsRepository,
            organization_members_repository_1.OrganizationMembersRepository,
            { provide: organization_members_repository_interface_1.ORGANIZATION_MEMBERS_REPOSITORY, useClass: organization_members_repository_1.OrganizationMembersRepository },
            sso_config_repository_1.SSOConfigRepository,
            organizations_service_1.OrganizationsService,
            sso_service_1.SSOService,
        ],
        exports: [organizations_service_1.OrganizationsService, organization_members_repository_1.OrganizationMembersRepository, organization_members_repository_interface_1.ORGANIZATION_MEMBERS_REPOSITORY],
    })
], OrganizationsModule);
//# sourceMappingURL=organizations.module.js.map