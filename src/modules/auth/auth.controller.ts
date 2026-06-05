import { Controller, Post, Body, Get, UseGuards, Req, Res, Logger } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { SignupWithInviteDto } from './dto/signup-with-invite.dto';
import { PublicSignupDto } from './dto/public-signup.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleConfigGuard } from './guards/google-config.guard';
import { Public } from '../../common/decorators/public.decorator';
import { getFrontendUrl } from '../../common/utils/frontend-url.util';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Public()
  @SkipThrottle({ default: true })
  @Post('login')
  async login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(dto);
  }

  @Public()
  @SkipThrottle({ default: true })
  @Post('super-admin/login')
  async superAdminLogin(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.superAdminLogin(dto);
  }

  @Public()
  @SkipThrottle({ default: true })
  @Post('signup')
  async signup(@Body() dto: PublicSignupDto): Promise<{ message: string; emailVerified?: boolean }> {
    this.logger.log(`Signup request: ${dto.email?.toLowerCase?.() ?? dto.email}`);
    return this.authService.signup(dto);
  }

  @Public()
  @SkipThrottle({ default: true })
  @Post('verify-email')
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<{ message: string }> {
    return this.authService.verifyEmail(dto.token);
  }

  @Public()
  @SkipThrottle({ default: true })
  @Post('resend-verification')
  async resendVerification(@Body() dto: ForgotPasswordDto): Promise<{ message: string }> {
    return this.authService.resendVerificationEmail(dto.email);
  }

  @Public()
  @SkipThrottle({ default: true })
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ message: string }> {
    return this.authService.requestPasswordReset(dto.email);
  }

  @Public()
  @SkipThrottle({ default: true })
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<{ message: string }> {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  @Public()
  @SkipThrottle({ default: true })
  @Post('signup-with-invite')
  async signupWithInvite(@Body() dto: SignupWithInviteDto): Promise<LoginResponseDto> {
    return this.authService.signupWithInvite(dto);
  }

  @UseGuards(JwtAuthGuard)
  @SkipThrottle({ auth: true })
  @Post('logout')
  async logout(): Promise<{ message: string }> {
    return { message: 'Logged out' };
  }

  @UseGuards(JwtAuthGuard)
  @SkipThrottle({ auth: true })
  @Get('password-status')
  async passwordStatus(@Req() req: { user: { userId: string } }): Promise<{ hasPassword: boolean }> {
    return this.authService.getPasswordStatus(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @SkipThrottle({ auth: true })
  @Post('change-password')
  async changePassword(
    @Req() req: { user: { userId: string } },
    @Body() dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.changePassword(req.user.userId, dto.currentPassword, dto.newPassword);
  }

  @Public()
  @SkipThrottle({ default: true })
  @Post('send-otp')
  async sendOtp(@Body() dto: SendOtpDto): Promise<{ message: string }> {
    return this.authService.sendOtp(dto.phone);
  }

  @Public()
  @SkipThrottle({ default: true })
  @Post('verify-otp')
  async verifyOtp(@Body() dto: VerifyOtpDto): Promise<LoginResponseDto> {
    return this.authService.verifyOtp(dto.phone, dto.code);
  }

  @Public()
  @SkipThrottle({ default: true })
  @Get('google')
  @UseGuards(GoogleConfigGuard, AuthGuard('google'))
  async googleAuth() {
    // Guard redirects to Google
  }

  @Public()
  @SkipThrottle({ default: true })
  @Get('google/callback')
  @UseGuards(GoogleConfigGuard, AuthGuard('google'))
  async googleAuthCallback(@Req() req: { user: { id: string; email: string; fullName: string } }, @Res() res: Response) {
    const token = await this.authService.loginWithGoogleUser(req.user);
    const frontendUrl = getFrontendUrl();
    res.redirect(`${frontendUrl}/auth/callback?token=${encodeURIComponent(token)}`);
  }
}
