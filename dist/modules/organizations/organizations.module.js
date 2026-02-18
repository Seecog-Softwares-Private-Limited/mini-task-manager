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
const organization_entity_1 = require("./entities/organization.entity");
const organization_member_entity_1 = require("./entities/organization-member.entity");
const organizations_repository_1 = require("./repositories/organizations.repository");
const organization_members_repository_1 = require("./repositories/organization-members.repository");
const organization_members_repository_interface_1 = require("./repositories/organization-members.repository.interface");
const organizations_service_1 = require("./organizations.service");
const organizations_controller_1 = require("./organizations.controller");
let OrganizationsModule = class OrganizationsModule {
};
exports.OrganizationsModule = OrganizationsModule;
exports.OrganizationsModule = OrganizationsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([organization_entity_1.OrganizationEntity, organization_member_entity_1.OrganizationMemberEntity]),
        ],
        controllers: [organizations_controller_1.OrganizationsController],
        providers: [
            organizations_repository_1.OrganizationsRepository,
            organization_members_repository_1.OrganizationMembersRepository,
            { provide: organization_members_repository_interface_1.ORGANIZATION_MEMBERS_REPOSITORY, useClass: organization_members_repository_1.OrganizationMembersRepository },
            organizations_service_1.OrganizationsService,
        ],
        exports: [organizations_service_1.OrganizationsService, organization_members_repository_1.OrganizationMembersRepository, organization_members_repository_interface_1.ORGANIZATION_MEMBERS_REPOSITORY],
    })
], OrganizationsModule);
//# sourceMappingURL=organizations.module.js.map