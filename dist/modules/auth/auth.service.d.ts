import { JwtService } from '@nestjs/jwt';
import { DataSource, Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { InvitationsService } from '../invitations/invitations.service';
import { EmailService } from '../invitations/email.service';
import { EmailVerificationTokenEntity } from './entities/email-verification-token.entity';
import { PasswordResetTokenEntity } from './entities/password-reset-token.entity';
import { OtpCodeEntity } from './entities/otp-code.entity';
import { SmsService } from './services/sms.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { SignupWithInviteDto } from './dto/signup-with-invite.dto';
import { PublicSignupDto } from './dto/public-signup.dto';
import type { Profile } from 'passport-google-oauth20';
export declare class AuthService {
    private readonly usersService;
    private readonly jwtService;
    private readonly emailService;
    private readonly invitationsService;
    private readonly organizationsService;
    private readonly verificationTokenRepo;
    private readonly passwordResetTokenRepo;
    private readonly otpCodeRepo;
    private readonly smsService;
    private readonly dataSource;
    private readonly logger;
    constructor(usersService: UsersService, jwtService: JwtService, emailService: EmailService, invitationsService: InvitationsService, organizationsService: OrganizationsService, verificationTokenRepo: Repository<EmailVerificationTokenEntity>, passwordResetTokenRepo: Repository<PasswordResetTokenEntity>, otpCodeRepo: Repository<OtpCodeEntity>, smsService: SmsService, dataSource: DataSource);
    login(dto: LoginDto): Promise<LoginResponseDto>;
    validateUserById(userId: string): Promise<{
        id: string;
        email: string;
    } | null>;
    validateGoogleUser(profile: Profile): Promise<{
        id: string;
        email: string;
        fullName: string;
    }>;
    signup(dto: PublicSignupDto): Promise<{
        message: string;
        emailVerified?: boolean;
        devVerificationCode?: string;
        verifyPageUrl?: string;
    }>;
    verifyEmail(tokenOrCode: string): Promise<{
        message: string;
    }>;
    resendVerificationEmail(email: string): Promise<{
        message: string;
        devVerificationCode?: string;
        verifyPageUrl?: string;
    }>;
    requestPasswordReset(email: string): Promise<{
        message: string;
    }>;
    resetPassword(token: string, password: string): Promise<{
        message: string;
    }>;
    loginWithGoogleUser(user: {
        id: string;
        email: string;
        fullName: string;
    }): Promise<string>;
    sendOtp(phone: string): Promise<{
        message: string;
    }>;
    verifyOtp(phone: string, code: string): Promise<LoginResponseDto>;
    signupWithInvite(dto: SignupWithInviteDto): Promise<LoginResponseDto>;
    private issueAndSendVerificationEmail;
    private withDevVerificationCode;
    private generateUniqueVerificationShortCode;
}
