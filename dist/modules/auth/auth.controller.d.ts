import { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { SignupWithInviteDto } from './dto/signup-with-invite.dto';
import { PublicSignupDto } from './dto/public-signup.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
export declare class AuthController {
    private readonly authService;
    private readonly logger;
    constructor(authService: AuthService);
    login(dto: LoginDto): Promise<LoginResponseDto>;
    signup(dto: PublicSignupDto): Promise<{
        message: string;
        emailVerified?: boolean;
    }>;
    verifyEmail(dto: VerifyEmailDto): Promise<{
        message: string;
    }>;
    resendVerification(dto: ForgotPasswordDto): Promise<{
        message: string;
    }>;
    forgotPassword(dto: ForgotPasswordDto): Promise<{
        message: string;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        message: string;
    }>;
    signupWithInvite(dto: SignupWithInviteDto): Promise<LoginResponseDto>;
    logout(): Promise<{
        message: string;
    }>;
    sendOtp(dto: SendOtpDto): Promise<{
        message: string;
    }>;
    verifyOtp(dto: VerifyOtpDto): Promise<LoginResponseDto>;
    googleAuth(): Promise<void>;
    googleAuthCallback(req: {
        user: {
            id: string;
            email: string;
            fullName: string;
        };
    }, res: Response): Promise<void>;
}
