"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvitationsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const organization_invitation_entity_1 = require("./entities/organization-invitation.entity");
const invitations_repository_1 = require("./repositories/invitations.repository");
const invitations_service_1 = require("./invitations.service");
const invitations_controller_1 = require("./invitations.controller");
const email_service_1 = require("./email.service");
const auth_module_1 = require("../auth/auth.module");
const organizations_module_1 = require("../organizations/organizations.module");
const users_module_1 = require("../users/users.module");
const billing_module_1 = require("../billing/billing.module");
let InvitationsModule = class InvitationsModule {
};
exports.InvitationsModule = InvitationsModule;
exports.InvitationsModule = InvitationsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([organization_invitation_entity_1.OrganizationInvitationEntity]),
            (0, common_1.forwardRef)(() => auth_module_1.AuthModule),
            organizations_module_1.OrganizationsModule,
            users_module_1.UsersModule,
            (0, common_1.forwardRef)(() => billing_module_1.BillingModule),
        ],
        controllers: [invitations_controller_1.InvitationsController],
        providers: [invitations_repository_1.InvitationsRepository, invitations_service_1.InvitationsService, email_service_1.EmailService],
        exports: [invitations_service_1.InvitationsService, email_service_1.EmailService],
    })
], InvitationsModule);
//# sourceMappingURL=invitations.module.js.map