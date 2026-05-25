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
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const jwt_1 = require("@nestjs/jwt");
const typeorm_2 = require("typeorm");
const crypto = require("crypto");
const users_service_1 = require("../users/users.service");
const invitations_service_1 = require("../invitations/invitations.service");
const email_service_1 = require("../invitations/email.service");
const user_entity_1 = require("../users/entities/user.entity");
const organization_member_entity_1 = require("../organizations/entities/organization-member.entity");
const organization_invitation_entity_1 = require("../invitations/entities/organization-invitation.entity");
const email_verification_token_entity_1 = require("./entities/email-verification-token.entity");
const password_reset_token_entity_1 = require("./entities/password-reset-token.entity");
const otp_code_entity_1 = require("./entities/otp-code.entity");
const sms_service_1 = require("./services/sms.service");
const uuid_util_1 = require("../../common/utils/uuid.util");
const organizations_service_1 = require("../organizations/organizations.service");
let AuthService = AuthService_1 = class AuthService {
    constructor(usersService, jwtService, emailService, invitationsService, organizationsService, verificationTokenRepo, passwordResetTokenRepo, otpCodeRepo, smsService, dataSource) {
        this.usersService = usersService;
        this.jwtService = jwtService;
        this.emailService = emailService;
        this.invitationsService = invitationsService;
        this.organizationsService = organizationsService;
        this.verificationTokenRepo = verificationTokenRepo;
        this.passwordResetTokenRepo = passwordResetTokenRepo;
        this.otpCodeRepo = otpCodeRepo;
        this.smsService = smsService;
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(AuthService_1.name);
    }
    async login(dto) {
        const email = dto.email.toLowerCase().trim();
        const user = await this.usersService.findByEmail(email);
        if (!user || !(await this.usersService.validatePassword(user.id, dto.password))) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        if (!user.isEmailVerified) {
            throw new common_1.UnauthorizedException('Please verify your email first. Check your inbox for the verification link.');
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
    async validateGoogleUser(profile) {
        const googleId = profile.id;
        const email = (profile.emails?.[0]?.value || '').toLowerCase().trim();
        const fullName = profile.displayName || profile.name?.givenName || email.split('@')[0] || 'User';
        if (!email) {
            throw new common_1.BadRequestException('Google profile did not include an email address.');
        }
        let user = await this.usersService.findByGoogleId(googleId);
        if (user) {
            return { id: user.id, email: user.email, fullName: user.fullName };
        }
        user = await this.usersService.findByEmail(email);
        if (user) {
            await this.usersService.linkGoogleId(user.id, googleId);
            return { id: user.id, email: user.email, fullName: user.fullName };
        }
        const userId = (0, uuid_util_1.generateUuid)();
        await this.dataSource.manager.save(user_entity_1.UserEntity, {
            id: userId,
            email,
            fullName,
            passwordHash: null,
            googleId,
            isEmailVerified: true,
        });
        let org;
        try {
            org = await this.organizationsService.create(userId, {
                name: 'My Workspace',
                slug: `workspace-${userId.replace(/-/g, '').slice(0, 12)}`,
            });
        }
        catch {
        }
        return { id: userId, email, fullName };
    }
    async signup(dto) {
        const email = dto.email.toLowerCase().trim();
        const existingUser = await this.usersService.findByEmail(email);
        if (existingUser) {
            if (!existingUser.isEmailVerified) {
                await this.verificationTokenRepo.delete({ userId: existingUser.id });
                const token = crypto.randomBytes(32).toString('hex');
                const expiresAt = new Date();
                expiresAt.setHours(expiresAt.getHours() + 24);
                await this.verificationTokenRepo.save({
                    id: (0, uuid_util_1.generateUuid)(),
                    userId: existingUser.id,
                    token,
                    expiresAt,
                });
                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
                const verifyUrl = `${frontendUrl}/verify-email?token=${token}`;
                try {
                    await this.emailService.sendVerificationEmail({
                        to: email,
                        fullName: existingUser.fullName,
                        verifyUrl,
                    });
                }
                catch (emailErr) {
                    this.logger.error(`Failed to resend verification email to ${email}: ${emailErr}`);
                }
                return { message: 'Verification email sent. Please check your inbox.' };
            }
            throw new common_1.ConflictException('An account with this email already exists. Please sign in instead.');
        }
        const userId = (0, uuid_util_1.generateUuid)();
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            await queryRunner.manager.save(user_entity_1.UserEntity, {
                id: userId,
                email,
                fullName: dto.fullName.trim(),
                passwordHash: dto.password,
                isEmailVerified: false,
            });
            await queryRunner.commitTransaction();
            this.logger.log(`User created: ${email} (id: ${userId})`);
        }
        catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        }
        finally {
            await queryRunner.release();
        }
        try {
            await this.organizationsService.create(userId, {
                name: 'My Workspace',
                slug: `workspace-${userId.replace(/-/g, '').slice(0, 12)}`,
            });
        }
        catch {
        }
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);
        await this.verificationTokenRepo.save({
            id: (0, uuid_util_1.generateUuid)(),
            userId,
            token,
            expiresAt,
        });
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
        const verifyUrl = `${frontendUrl}/verify-email?token=${token}`;
        try {
            await this.emailService.sendVerificationEmail({
                to: email,
                fullName: dto.fullName,
                verifyUrl,
            });
            this.logger.log(`Verification email sent to ${email}`);
        }
        catch (emailErr) {
            this.logger.error(`Failed to send verification email to ${email}: ${emailErr}`);
        }
        return {
            message: 'Account created. Please verify your email before signing in.',
            emailVerified: false,
        };
    }
    async verifyEmail(token) {
        const record = await this.verificationTokenRepo.findOne({
            where: { token },
            relations: ['user'],
        });
        if (!record || !record.user) {
            throw new common_1.BadRequestException('Invalid or expired verification link.');
        }
        if (new Date() > record.expiresAt) {
            throw new common_1.BadRequestException('Verification link has expired. Please request a new one.');
        }
        await this.usersService.updateEmailVerified(record.userId, true);
        await this.verificationTokenRepo.delete(record.id);
        return { message: 'Email verified successfully. You can now sign in.' };
    }
    async resendVerificationEmail(email) {
        const user = await this.usersService.findByEmail(email.toLowerCase().trim());
        if (!user) {
            return { message: 'If an account exists with this email, you will receive a verification link.' };
        }
        if (user.isEmailVerified) {
            return { message: 'Email is already verified. You can sign in.' };
        }
        await this.verificationTokenRepo.delete({ userId: user.id });
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);
        await this.verificationTokenRepo.save({
            id: (0, uuid_util_1.generateUuid)(),
            userId: user.id,
            token,
            expiresAt,
        });
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
        const verifyUrl = `${frontendUrl}/verify-email?token=${token}`;
        await this.emailService.sendVerificationEmail({
            to: user.email,
            fullName: user.fullName,
            verifyUrl,
        });
        return { message: 'Verification email sent. Please check your inbox (and spam folder).' };
    }
    async requestPasswordReset(email) {
        const user = await this.usersService.findByEmail(email.toLowerCase().trim());
        if (!user) {
            return { message: 'If an account exists with this email, you will receive a password reset link.' };
        }
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1);
        await this.passwordResetTokenRepo.save({
            id: (0, uuid_util_1.generateUuid)(),
            userId: user.id,
            token,
            expiresAt,
        });
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
        const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
        await this.emailService.sendPasswordResetEmail({
            to: user.email,
            fullName: user.fullName,
            resetUrl,
        });
        return { message: 'If an account exists with this email, you will receive a password reset link.' };
    }
    async resetPassword(token, password) {
        const record = await this.passwordResetTokenRepo.findOne({
            where: { token },
            relations: ['user'],
        });
        if (!record || !record.user) {
            throw new common_1.BadRequestException('Invalid or expired reset link.');
        }
        if (new Date() > record.expiresAt) {
            throw new common_1.BadRequestException('Reset link has expired. Please request a new one.');
        }
        await this.usersService.updatePassword(record.userId, password);
        await this.passwordResetTokenRepo.delete(record.id);
        return { message: 'Password reset successfully. You can now sign in.' };
    }
    async loginWithGoogleUser(user) {
        const payload = { sub: user.id, email: user.email };
        return this.jwtService.sign(payload);
    }
    async sendOtp(phone) {
        const normalized = this.smsService.normalizePhone(phone.replace(/\s/g, ''));
        if (!normalized) {
            throw new common_1.BadRequestException('Invalid phone number. Use format: +1234567890 or 1234567890');
        }
        const code = crypto.randomInt(100000, 999999).toString();
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10);
        await this.otpCodeRepo.delete({ phone: normalized });
        await this.otpCodeRepo.save({
            id: (0, uuid_util_1.generateUuid)(),
            phone: normalized,
            code,
            expiresAt,
        });
        const sent = await this.smsService.sendOtp(normalized, code);
        if (!sent) {
            throw new common_1.BadRequestException('SMS service is not configured. Please contact support.');
        }
        return { message: 'Verification code sent to your phone.' };
    }
    async verifyOtp(phone, code) {
        const normalized = this.smsService.normalizePhone(phone.replace(/\s/g, ''));
        if (!normalized) {
            throw new common_1.BadRequestException('Invalid phone number.');
        }
        const record = await this.otpCodeRepo.findOne({
            where: { phone: normalized, code },
        });
        if (!record) {
            throw new common_1.UnauthorizedException('Invalid or expired verification code.');
        }
        if (new Date() > record.expiresAt) {
            await this.otpCodeRepo.delete(record.id);
            throw new common_1.UnauthorizedException('Verification code has expired. Please request a new one.');
        }
        await this.otpCodeRepo.delete(record.id);
        let user = await this.usersService.findByPhone(normalized);
        if (!user) {
            const userId = (0, uuid_util_1.generateUuid)();
            await this.dataSource.manager.save(user_entity_1.UserEntity, {
                id: userId,
                email: `${normalized.replace('+', '')}@phone.user`,
                fullName: `User ${normalized.slice(-4)}`,
                passwordHash: null,
                phone: normalized,
                isEmailVerified: false,
            });
            try {
                await this.organizationsService.create(userId, {
                    name: 'My Workspace',
                    slug: `workspace-${userId.replace(/-/g, '').slice(0, 12)}`,
                });
            }
            catch {
            }
            user = await this.usersService.findByPhone(normalized);
            if (!user)
                throw new common_1.BadRequestException('Failed to create user.');
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
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const mgr = queryRunner.manager;
            await mgr.save(user_entity_1.UserEntity, {
                id: userId,
                email,
                fullName: dto.fullName,
                passwordHash: dto.password,
                isEmailVerified: true,
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
            organizationId: invitation.organizationId,
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, common_1.Inject)((0, common_1.forwardRef)(() => invitations_service_1.InvitationsService))),
    __param(4, (0, common_1.Inject)((0, common_1.forwardRef)(() => organizations_service_1.OrganizationsService))),
    __param(5, (0, typeorm_1.InjectRepository)(email_verification_token_entity_1.EmailVerificationTokenEntity)),
    __param(6, (0, typeorm_1.InjectRepository)(password_reset_token_entity_1.PasswordResetTokenEntity)),
    __param(7, (0, typeorm_1.InjectRepository)(otp_code_entity_1.OtpCodeEntity)),
    __param(9, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService,
        email_service_1.EmailService,
        invitations_service_1.InvitationsService,
        organizations_service_1.OrganizationsService,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        sms_service_1.SmsService,
        typeorm_2.DataSource])
], AuthService);
//# sourceMappingURL=auth.service.js.map