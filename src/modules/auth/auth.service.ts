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
import { toStoredPassword } from '../users/password-storage.util';
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
import { getFrontendUrl, buildEmailVerificationUrls } from '../../common/utils/frontend-url.util';
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
    if (!user.isActive) {
      throw new UnauthorizedException('Your account has been deactivated. Contact support.');
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
    const payload = {
      sub: user.id,
      email: user.email,
      roles: user.isPlatformAdmin ? ['SUPER_ADMIN'] : [],
    };
    const accessToken = this.jwtService.sign(payload);
    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        isPlatformAdmin: user.isPlatformAdmin,
      },
    };
  }

  async superAdminLogin(dto: LoginDto): Promise<LoginResponseDto> {
    const res = await this.login(dto);
    if (!res.user.isPlatformAdmin) {
      throw new UnauthorizedException('Super admin access required');
    }
    return res;
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

  async signup(
    dto: PublicSignupDto,
  ): Promise<{
    message: string;
    emailVerified?: boolean;
    accessToken?: string;
    user?: LoginResponseDto['user'];
    organizationId?: string;
    devVerificationCode?: string;
    verifyPageUrl?: string;
  }> {
    const email = dto.email.toLowerCase().trim();
    const skipVerification =
      String(process.env.SKIP_EMAIL_VERIFICATION ?? '').toLowerCase() === 'true';
    const existingUser = await this.usersService.findByEmail(email);

    // If user exists but hasn't verified email, allow re-signup (refresh password + verification email)
    if (existingUser) {
      if (!existingUser.isEmailVerified) {
        await this.usersService.updatePassword(existingUser.id, dto.password);
        const fullName = dto.fullName.trim();
        if (fullName && fullName !== existingUser.fullName) {
          await this.usersService.updateFullName(existingUser.id, fullName);
        }
        const sent = await this.issueAndSendVerificationEmail(
          existingUser.id,
          email,
          fullName || existingUser.fullName,
        );
        return this.withDevVerificationCode(
          { message: 'Verification email sent. Please check your inbox.', emailVerified: false },
          sent,
        );
      }
      // Verified but no workspaces left (e.g. super-admin deleted all tenants) — allow fresh signup.
      if (!existingUser.isPlatformAdmin && (await this.usersService.isOrphanUser(existingUser.id))) {
        await this.usersService.deleteById(existingUser.id);
      } else {
        throw new ConflictException('An account with this email already exists. Please sign in instead.');
      }
    }

    const userId = generateUuid();
    const fullName = dto.fullName.trim();

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.save(UserEntity, {
        id: userId,
        email,
        fullName,
        passwordHash: await toStoredPassword(dto.password),
        isEmailVerified: skipVerification,
      } as Partial<UserEntity>);
      await queryRunner.commitTransaction();
      this.logger.log(`User created: ${email} (id: ${userId}, verified=${skipVerification})`);
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

    if (skipVerification) {
      const user = await this.usersService.findById(userId);
      if (!user) {
        throw new BadRequestException('Account created but sign-in could not be completed. Please sign in.');
      }
      return {
        ...(await this.buildLoginResponse(user)),
        message: 'Account created. You are signed in.',
        emailVerified: true,
      };
    }

    const sent = await this.issueAndSendVerificationEmail(userId, email, fullName);

    return this.withDevVerificationCode(
      {
        message: 'Verification email sent. Please check your inbox (and spam folder).',
        emailVerified: false,
      },
      sent,
    );
  }

  async verifyEmail(tokenOrCode: string): Promise<LoginResponseDto & { message: string }> {
    const trimmed = tokenOrCode.trim();
    const isShortCode = /^\d{6}$/.test(trimmed);

    const record = await this.verificationTokenRepo.findOne({
      where: isShortCode ? { shortCode: trimmed } : { token: trimmed },
      relations: ['user'],
    });
    if (!record || !record.user || record.pendingEmail) {
      throw new BadRequestException(
        isShortCode
          ? 'Invalid or expired verification code.'
          : 'Invalid or expired verification link.',
      );
    }
    if (new Date() > record.expiresAt) {
      throw new BadRequestException('Verification link has expired. Please request a new one.');
    }

    await this.usersService.updateEmailVerified(record.userId, true);
    await this.verificationTokenRepo.delete(record.id);

    const refreshedUser = await this.usersService.findById(record.userId);
    if (!refreshedUser) {
      throw new BadRequestException('User not found after verification.');
    }

    return {
      ...(await this.buildLoginResponse(refreshedUser)),
      message: 'Email verified successfully.',
    };
  }

  async resendVerificationEmail(email: string): Promise<{
    message: string;
    devVerificationCode?: string;
    verifyPageUrl?: string;
  }> {
    const user = await this.usersService.findByEmail(email.toLowerCase().trim());
    if (!user) {
      return { message: 'If an account exists with this email, you will receive a verification link.' };
    }
    if (user.isEmailVerified) {
      return { message: 'Email is already verified. You can sign in.' };
    }

    const sent = await this.issueAndSendVerificationEmail(user.id, user.email, user.fullName);

    return this.withDevVerificationCode(
      { message: 'Verification email sent. Please check your inbox (and spam folder).' },
      sent,
    );
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

    const frontendUrl = getFrontendUrl();
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

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

  async getPasswordStatus(userId: string): Promise<{ hasPassword: boolean }> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new BadRequestException('User not found');
    const hasPassword = Boolean(user.passwordHash?.trim());
    return { hasPassword };
  }

  async changePassword(
    userId: string,
    currentPassword: string | undefined,
    newPassword: string,
  ): Promise<{ message: string }> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new BadRequestException('User not found');
    if (!user.isActive) {
      throw new BadRequestException('Your account is deactivated.');
    }

    const hasPassword = Boolean(user.passwordHash?.trim());
    if (hasPassword) {
      const current = currentPassword ?? '';
      if (!current) {
        throw new BadRequestException('Current password is required');
      }
      const valid = await this.usersService.validatePassword(userId, current);
      if (!valid) {
        throw new BadRequestException('Current password is incorrect');
      }
    }

    if (hasPassword && currentPassword === newPassword) {
      throw new BadRequestException('New password must be different from your current password');
    }

    await this.usersService.updatePassword(userId, newPassword);
    return {
      message: hasPassword
        ? 'Password updated successfully'
        : 'Password set successfully. You can now sign in with email and password.',
    };
  }

  async requestEmailChange(
    userId: string,
    newEmailRaw: string,
  ): Promise<{
    message: string;
    pendingEmail: string;
    devVerificationCode?: string;
  }> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new BadRequestException('User not found');
    if (!user.isActive) {
      throw new BadRequestException('Your account is deactivated.');
    }

    const newEmail = newEmailRaw.toLowerCase().trim();
    if (!newEmail) {
      throw new BadRequestException('Enter a valid email address');
    }
    if (newEmail === user.email.toLowerCase()) {
      throw new BadRequestException('New email must be different from your current email');
    }

    const existing = await this.usersService.findByEmail(newEmail);
    if (existing && existing.id !== userId) {
      throw new ConflictException('That email is already used by another account');
    }

    await this.verificationTokenRepo.delete({ userId });

    const token = crypto.randomBytes(32).toString('hex');
    const shortCode = await this.generateUniqueVerificationShortCode();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await this.verificationTokenRepo.save({
      id: generateUuid(),
      userId,
      pendingEmail: newEmail,
      token,
      shortCode,
      expiresAt,
    } as Partial<EmailVerificationTokenEntity>);

    this.logger.log(`Sending email-change verification to ${newEmail} for user ${userId}`);
    if (process.env.NODE_ENV !== 'production') {
      this.logger.log(`[dev] Email-change code for ${newEmail}: ${shortCode}`);
    }

    await this.emailService.sendEmailChangeVerification({
      to: newEmail,
      fullName: user.fullName,
      shortCode,
    });

    const response = {
      message: 'Verification code sent to your new email. Enter it to confirm the change.',
      pendingEmail: newEmail,
    };
    if (process.env.NODE_ENV === 'production') return response;
    return { ...response, devVerificationCode: shortCode };
  }

  async verifyEmailChange(
    userId: string,
    tokenOrCode: string,
  ): Promise<LoginResponseDto & { message: string }> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new BadRequestException('User not found');
    if (!user.isActive) {
      throw new BadRequestException('Your account is deactivated.');
    }

    const trimmed = tokenOrCode.trim();
    const isShortCode = /^\d{6}$/.test(trimmed);
    const record = await this.verificationTokenRepo.findOne({
      where: isShortCode ? { shortCode: trimmed, userId } : { token: trimmed, userId },
    });

    if (!record || !record.pendingEmail) {
      throw new BadRequestException(
        isShortCode
          ? 'Invalid or expired verification code.'
          : 'Invalid or expired verification link.',
      );
    }
    if (new Date() > record.expiresAt) {
      throw new BadRequestException('Verification code has expired. Please request a new one.');
    }

    const pendingEmail = record.pendingEmail.toLowerCase().trim();
    const conflict = await this.usersService.findByEmail(pendingEmail);
    if (conflict && conflict.id !== userId) {
      throw new ConflictException('That email is already used by another account');
    }

    await this.usersService.updateEmail(userId, pendingEmail);
    await this.verificationTokenRepo.delete(record.id);

    const refreshedUser = await this.usersService.findById(userId);
    if (!refreshedUser) {
      throw new BadRequestException('User not found after email change.');
    }

    return {
      ...(await this.buildLoginResponse(refreshedUser)),
      message: 'Email updated successfully.',
    };
  }

  async loginWithGoogleUser(user: { id: string; email: string; fullName: string }): Promise<string> {
    const payload = { sub: user.id, email: user.email };
    return this.jwtService.sign(payload);
  }

  async issueCustomToken(payload: Record<string, unknown>): Promise<string> {
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
        passwordHash: await toStoredPassword(dto.password),
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

  /** Create a fresh verification token and send the signup verification email. */
  private async issueAndSendVerificationEmail(
    userId: string,
    email: string,
    fullName: string,
  ): Promise<{ shortCode: string; verifyPageUrl: string }> {
    await this.verificationTokenRepo.delete({ userId });

    const token = crypto.randomBytes(32).toString('hex');
    const shortCode = await this.generateUniqueVerificationShortCode();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await this.verificationTokenRepo.save({
      id: generateUuid(),
      userId,
      pendingEmail: null,
      token,
      shortCode,
      expiresAt,
    } as Partial<EmailVerificationTokenEntity>);

    const { verifyPageUrl, verifyUrl } = buildEmailVerificationUrls(token);
    this.logger.log(`Sending signup verification email to ${email} (verifyUrl host=${new URL(verifyUrl).host})`);
    if (process.env.NODE_ENV !== 'production') {
      this.logger.log(`[dev] Verification code for ${email}: ${shortCode} — open ${verifyPageUrl}`);
      this.logger.log(`[dev] Verification link for ${email}: ${verifyUrl}`);
    }

    await this.emailService.sendVerificationEmail({
      to: email,
      fullName,
      verifyUrl,
      verifyPageUrl,
      shortCode,
    });

    return { shortCode, verifyPageUrl };
  }

  /** In local dev, return the code on the API response — Gmail often drops localhost emails silently. */
  private withDevVerificationCode<T extends { message: string }>(
    response: T,
    sent?: { shortCode: string; verifyPageUrl: string },
  ): T & { devVerificationCode?: string; verifyPageUrl?: string } {
    if (process.env.NODE_ENV === 'production' || !sent) return response;
    return {
      ...response,
      devVerificationCode: sent.shortCode,
      verifyPageUrl: sent.verifyPageUrl,
    };
  }

  private async buildLoginResponse(user: UserEntity): Promise<LoginResponseDto> {
    const payload = {
      sub: user.id,
      email: user.email,
      roles: user.isPlatformAdmin ? ['SUPER_ADMIN'] : [],
    };
    const accessToken = this.jwtService.sign(payload);
    const orgs = await this.organizationsService.findOrganizationsForUser(user.id);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        isPlatformAdmin: user.isPlatformAdmin,
      },
      organizationId: orgs[0]?.id,
    };
  }

  private async generateUniqueVerificationShortCode(): Promise<string> {
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = String(crypto.randomInt(100000, 1000000));
      const existing = await this.verificationTokenRepo.findOne({ where: { shortCode: code } });
      if (!existing) return code;
    }
    throw new BadRequestException('Could not generate verification code. Please try again.');
  }
}
