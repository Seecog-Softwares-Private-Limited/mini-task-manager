import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { DataSource, Repository } from 'typeorm';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { InvitationsService } from '../invitations/invitations.service';
import { EmailService } from '../invitations/email.service';
import { UserEntity } from '../users/entities/user.entity';
import { OrganizationMemberEntity } from '../organizations/entities/organization-member.entity';
import { OrganizationInvitationEntity } from '../invitations/entities/organization-invitation.entity';
import { EmailVerificationTokenEntity } from './entities/email-verification-token.entity';
import { PasswordResetTokenEntity } from './entities/password-reset-token.entity';
import { OtpCodeEntity } from './entities/otp-code.entity';
import { SmsService } from './services/sms.service';
import { generateUuid } from '../../common/utils/uuid.util';
import { resolveFrontendPublicUrl } from '../../common/utils/frontend-url.util';
import { OrganizationsService } from '../organizations/organizations.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { SignupWithInviteDto } from './dto/signup-with-invite.dto';
import { PublicSignupDto } from './dto/public-signup.dto';
import type { Profile } from 'passport-google-oauth20';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    @Inject(forwardRef(() => InvitationsService))
    private readonly invitationsService: InvitationsService,
    @Inject(forwardRef(() => OrganizationsService))
    private readonly organizationsService: OrganizationsService,
    @InjectRepository(EmailVerificationTokenEntity)
    private readonly verificationTokenRepo: Repository<EmailVerificationTokenEntity>,
    @InjectRepository(PasswordResetTokenEntity)
    private readonly passwordResetTokenRepo: Repository<PasswordResetTokenEntity>,
    @InjectRepository(OtpCodeEntity)
    private readonly otpCodeRepo: Repository<OtpCodeEntity>,
    private readonly smsService: SmsService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const email = dto.email.toLowerCase().trim();
    const user = await this.usersService.findByEmail(email);
    if (!user || !(await this.usersService.validatePassword(user.id, dto.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    // Email verification: strict only if REQUIRE_EMAIL_VERIFIED_FOR_LOGIN=true (e.g. production).
    // By default, successful password login auto-verifies so legacy / seed users are not stuck.
    const strictEmailVerification =
      String(process.env.REQUIRE_EMAIL_VERIFIED_FOR_LOGIN ?? '').toLowerCase() === 'true';
    if (!user.isEmailVerified) {
      if (strictEmailVerification) {
        throw new UnauthorizedException(
          'Please verify your email first. Check your inbox for the verification link.',
        );
      }
      await this.usersService.updateEmailVerified(user.id, true);
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

  async validateUserById(userId: string): Promise<{ id: string; email: string } | null> {
    return this.usersService.findByIdForAuth(userId);
  }

  async validateGoogleUser(profile: Profile): Promise<{ id: string; email: string; fullName: string }> {
    const googleId = profile.id;
    const email = (profile.emails?.[0]?.value || '').toLowerCase().trim();
    const fullName = profile.displayName || profile.name?.givenName || email.split('@')[0] || 'User';

    if (!email) {
      throw new BadRequestException('Google profile did not include an email address.');
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

    const userId = generateUuid();
    await this.dataSource.manager.save(UserEntity, {
      id: userId,
      email,
      fullName,
      passwordHash: null,
      googleId,
      isEmailVerified: true,
    } as Partial<UserEntity>);

    let org;
    try {
      org = await this.organizationsService.create(userId, {
        name: 'My Workspace',
        slug: `workspace-${userId.replace(/-/g, '').slice(0, 12)}`,
      });
    } catch {
      // org creation may fail; user still exists
    }

    return { id: userId, email, fullName };
  }

  async signup(dto: PublicSignupDto): Promise<{ message: string; emailVerified?: boolean }> {
    const email = dto.email.toLowerCase().trim();
    const existingUser = await this.usersService.findByEmail(email);

    // If user exists but hasn't verified email, allow re-sending verification
    if (existingUser) {
      if (!existingUser.isEmailVerified) {
        // User exists but never verified — resend verification email
        await this.verificationTokenRepo.delete({ userId: existingUser.id });

        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        await this.verificationTokenRepo.save({
          id: generateUuid(),
          userId: existingUser.id,
          token,
          expiresAt,
        } as Partial<EmailVerificationTokenEntity>);

        const verifyUrl = `${resolveFrontendPublicUrl()}/verify-email?token=${token}`;

        try {
          await this.emailService.sendVerificationEmail({
            to: email,
            fullName: existingUser.fullName,
            verifyUrl,
          });
        } catch (emailErr) {
          this.logger.error(`Failed to resend verification email to ${email}: ${emailErr}`);
        }

        return { message: 'Verification email sent. Please check your inbox.' };
      }
      throw new ConflictException('An account with this email already exists. Please sign in instead.');
    }

    const userId = generateUuid();

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.save(UserEntity, {
        id: userId,
        email,
        fullName: dto.fullName.trim(),
        passwordHash: dto.password,
        // Verification email is sent after commit; login still works when REQUIRE_EMAIL_VERIFIED_FOR_LOGIN is not set
        // (login auto-verifies), but users receive the inbox link they expect from the signup UI.
        isEmailVerified: false,
      } as Partial<UserEntity>);
      await queryRunner.commitTransaction();
      this.logger.log(`User created: ${email} (id: ${userId})`);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }

    // Create default workspace
    try {
      await this.organizationsService.create(userId, {
        name: 'My Workspace',
        slug: `workspace-${userId.replace(/-/g, '').slice(0, 12)}`,
      });
    } catch {
      // Org creation may fail (e.g. slug collision); user already exists
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await this.verificationTokenRepo.save({
      id: generateUuid(),
      userId,
      token,
      expiresAt,
    } as Partial<EmailVerificationTokenEntity>);

    const verifyUrl = `${resolveFrontendPublicUrl()}/verify-email?token=${token}`;
    try {
      await this.emailService.sendVerificationEmail({
        to: email,
        fullName: dto.fullName.trim(),
        verifyUrl,
      });
    } catch (emailErr) {
      this.logger.error(`Failed to send signup verification email to ${email}: ${emailErr}`);
      return {
        message:
          'Account created, but we could not send the verification email. Check SMTP settings in properties.env, or use "Resend verification" on the sign-in page.',
        emailVerified: false,
      };
    }

    return {
      message: 'Verification email sent. Please check your inbox (and spam folder).',
      emailVerified: false,
    };
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const record = await this.verificationTokenRepo.findOne({
      where: { token },
      relations: ['user'],
    });
    if (!record || !record.user) {
      throw new BadRequestException('Invalid or expired verification link.');
    }
    if (new Date() > record.expiresAt) {
      throw new BadRequestException('Verification link has expired. Please request a new one.');
    }

    await this.usersService.updateEmailVerified(record.userId, true);
    await this.verificationTokenRepo.delete(record.id);

    return { message: 'Email verified successfully. You can now sign in.' };
  }

  async resendVerificationEmail(email: string): Promise<{ message: string }> {
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
      id: generateUuid(),
      userId: user.id,
      token,
      expiresAt,
    } as Partial<EmailVerificationTokenEntity>);

    const verifyUrl = `${resolveFrontendPublicUrl()}/verify-email?token=${token}`;

    await this.emailService.sendVerificationEmail({
      to: user.email,
      fullName: user.fullName,
      verifyUrl,
    });

    return { message: 'Verification email sent. Please check your inbox (and spam folder).' };
  }

  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email.toLowerCase().trim());
    if (!user) {
      return { message: 'If an account exists with this email, you will receive a password reset link.' };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await this.passwordResetTokenRepo.save({
      id: generateUuid(),
      userId: user.id,
      token,
      expiresAt,
    } as Partial<PasswordResetTokenEntity>);

    const resetUrl = `${resolveFrontendPublicUrl()}/reset-password?token=${token}`;

    await this.emailService.sendPasswordResetEmail({
      to: user.email,
      fullName: user.fullName,
      resetUrl,
    });

    return { message: 'If an account exists with this email, you will receive a password reset link.' };
  }

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    const record = await this.passwordResetTokenRepo.findOne({
      where: { token },
      relations: ['user'],
    });
    if (!record || !record.user) {
      throw new BadRequestException('Invalid or expired reset link.');
    }
    if (new Date() > record.expiresAt) {
      throw new BadRequestException('Reset link has expired. Please request a new one.');
    }

    await this.usersService.updatePassword(record.userId, password);
    await this.passwordResetTokenRepo.delete(record.id);

    return { message: 'Password reset successfully. You can now sign in.' };
  }

  async loginWithGoogleUser(user: { id: string; email: string; fullName: string }): Promise<string> {
    const payload = { sub: user.id, email: user.email };
    return this.jwtService.sign(payload);
  }

  async sendOtp(phone: string): Promise<{ message: string }> {
    const normalized = this.smsService.normalizePhone(phone.replace(/\s/g, ''));
    if (!normalized) {
      throw new BadRequestException('Invalid phone number. Use format: +1234567890 or 1234567890');
    }

    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    await this.otpCodeRepo.delete({ phone: normalized });
    await this.otpCodeRepo.save({
      id: generateUuid(),
      phone: normalized,
      code,
      expiresAt,
    } as Partial<OtpCodeEntity>);

    const sent = await this.smsService.sendOtp(normalized, code);
    if (!sent) {
      throw new BadRequestException('SMS service is not configured. Please contact support.');
    }

    return { message: 'Verification code sent to your phone.' };
  }

  async verifyOtp(phone: string, code: string): Promise<LoginResponseDto> {
    const normalized = this.smsService.normalizePhone(phone.replace(/\s/g, ''));
    if (!normalized) {
      throw new BadRequestException('Invalid phone number.');
    }

    const record = await this.otpCodeRepo.findOne({
      where: { phone: normalized, code },
    });
    if (!record) {
      throw new UnauthorizedException('Invalid or expired verification code.');
    }
    if (new Date() > record.expiresAt) {
      await this.otpCodeRepo.delete(record.id);
      throw new UnauthorizedException('Verification code has expired. Please request a new one.');
    }

    await this.otpCodeRepo.delete(record.id);

    let user = await this.usersService.findByPhone(normalized);
    if (!user) {
      const userId = generateUuid();
      await this.dataSource.manager.save(UserEntity, {
        id: userId,
        email: `${normalized.replace('+', '')}@phone.user`,
        fullName: `User ${normalized.slice(-4)}`,
        passwordHash: null,
        phone: normalized,
        isEmailVerified: false,
      } as Partial<UserEntity>);

      try {
        await this.organizationsService.create(userId, {
          name: 'My Workspace',
          slug: `workspace-${userId.replace(/-/g, '').slice(0, 12)}`,
        });
      } catch {
        // ignore
      }

      user = await this.usersService.findByPhone(normalized);
      if (!user) throw new BadRequestException('Failed to create user.');
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

  async signupWithInvite(dto: SignupWithInviteDto): Promise<LoginResponseDto> {
    const { valid, invitation, reason } = await this.invitationsService.validateToken(dto.token);
    if (!valid || !invitation) {
      throw new BadRequestException(reason ?? 'Invalid invitation');
    }

    const existingUser = await this.usersService.findByEmail(invitation.email);
    if (existingUser) {
      throw new ConflictException(
        'An account with this email already exists. Please sign in to accept the invitation.',
      );
    }

    const userId = generateUuid();
    const email = invitation.email.toLowerCase();

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const mgr = queryRunner.manager;

      await mgr.save(UserEntity, {
        id: userId,
        email,
        fullName: dto.fullName,
        passwordHash: dto.password,
        isEmailVerified: true,
      } as Partial<UserEntity>);

      await mgr.save(OrganizationMemberEntity, {
        id: generateUuid(),
        organizationId: invitation.organizationId,
        userId,
        role: invitation.role,
        status: 'ACTIVE',
      } as Partial<OrganizationMemberEntity>);

      await mgr.update(OrganizationInvitationEntity, { id: invitation.id }, { status: 'ACCEPTED' });

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
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
}
