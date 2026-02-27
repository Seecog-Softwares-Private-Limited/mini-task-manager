"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const jwt_1 = require("@nestjs/jwt");
const passport_1 = require("@nestjs/passport");
const config_1 = require("@nestjs/config");
const auth_controller_1 = require("./auth.controller");
const auth_service_1 = require("./auth.service");
const jwt_strategy_1 = require("./strategies/jwt.strategy");
const google_strategy_1 = require("./strategies/google.strategy");
const google_config_guard_1 = require("./guards/google-config.guard");
const tenant_guard_1 = require("./guards/tenant.guard");
const roles_guard_1 = require("./guards/roles.guard");
const email_verification_token_entity_1 = require("./entities/email-verification-token.entity");
const password_reset_token_entity_1 = require("./entities/password-reset-token.entity");
const otp_code_entity_1 = require("./entities/otp-code.entity");
const sms_service_1 = require("./services/sms.service");
const users_module_1 = require("../users/users.module");
const organizations_module_1 = require("../organizations/organizations.module");
const invitations_module_1 = require("../invitations/invitations.module");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([email_verification_token_entity_1.EmailVerificationTokenEntity, password_reset_token_entity_1.PasswordResetTokenEntity, otp_code_entity_1.OtpCodeEntity]),
            users_module_1.UsersModule,
            (0, common_1.forwardRef)(() => organizations_module_1.OrganizationsModule),
            (0, common_1.forwardRef)(() => invitations_module_1.InvitationsModule),
            passport_1.PassportModule.register({ defaultStrategy: 'jwt' }),
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                useFactory: (config) => ({
                    secret: config.get('jwt.secret', { infer: true }),
                    signOptions: {
                        expiresIn: config.get('jwt.expiresIn', { infer: true }),
                    },
                }),
                inject: [config_1.ConfigService],
            }),
        ],
        controllers: [auth_controller_1.AuthController],
        providers: [
            auth_service_1.AuthService,
            sms_service_1.SmsService,
            jwt_strategy_1.JwtStrategy,
            google_config_guard_1.GoogleConfigGuard,
            ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? [google_strategy_1.GoogleStrategy] : []),
            tenant_guard_1.TenantGuard,
            roles_guard_1.RolesGuard,
        ],
        exports: [auth_service_1.AuthService, jwt_1.JwtModule, tenant_guard_1.TenantGuard, roles_guard_1.RolesGuard],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map