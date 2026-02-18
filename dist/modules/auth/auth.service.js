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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const jwt_1 = require("@nestjs/jwt");
const typeorm_2 = require("typeorm");
const bcrypt = require("bcrypt");
const users_service_1 = require("../users/users.service");
const invitations_service_1 = require("../invitations/invitations.service");
const user_entity_1 = require("../users/entities/user.entity");
const organization_member_entity_1 = require("../organizations/entities/organization-member.entity");
const organization_invitation_entity_1 = require("../invitations/entities/organization-invitation.entity");
const uuid_util_1 = require("../../common/utils/uuid.util");
let AuthService = class AuthService {
    constructor(usersService, jwtService, invitationsService, dataSource) {
        this.usersService = usersService;
        this.jwtService = jwtService;
        this.invitationsService = invitationsService;
        this.dataSource = dataSource;
    }
    async login(dto) {
        const user = await this.usersService.findByEmail(dto.email);
        if (!user || !(await this.usersService.validatePassword(user.id, dto.password))) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const payload = { sub: user.id, email: user.email };
        const accessToken = this.jwtService.sign(payload);
        return {
            accessToken,
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
            },
        };
    }
    async validateUserById(userId) {
        return this.usersService.findByIdForAuth(userId);
    }
    async signupWithInvite(dto) {
        const { valid, invitation, reason } = await this.invitationsService.validateToken(dto.token);
        if (!valid || !invitation) {
            throw new common_1.BadRequestException(reason ?? 'Invalid invitation');
        }
        const existingUser = await this.usersService.findByEmail(invitation.email);
        if (existingUser) {
            throw new common_1.ConflictException('An account with this email already exists. Please sign in to accept the invitation.');
        }
        const userId = (0, uuid_util_1.generateUuid)();
        const email = invitation.email.toLowerCase();
        const hash = await bcrypt.hash(dto.password, 10);
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const mgr = queryRunner.manager;
            await mgr.save(user_entity_1.UserEntity, {
                id: userId,
                email,
                fullName: dto.fullName,
                passwordHash: hash,
            });
            await mgr.save(organization_member_entity_1.OrganizationMemberEntity, {
                id: (0, uuid_util_1.generateUuid)(),
                organizationId: invitation.organizationId,
                userId,
                role: invitation.role,
                status: 'ACTIVE',
            });
            await mgr.update(organization_invitation_entity_1.OrganizationInvitationEntity, { id: invitation.id }, { status: 'ACCEPTED' });
            await queryRunner.commitTransaction();
        }
        catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        }
        finally {
            await queryRunner.release();
        }
        const payload = { sub: userId, email };
        const accessToken = this.jwtService.sign(payload);
        return {
            accessToken,
            user: {
                id: userId,
                email,
                fullName: dto.fullName,
            },
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)((0, common_1.forwardRef)(() => invitations_service_1.InvitationsService))),
    __param(3, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService,
        invitations_service_1.InvitationsService,
        typeorm_2.DataSource])
], AuthService);
//# sourceMappingURL=auth.service.js.map