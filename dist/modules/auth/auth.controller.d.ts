import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { SignupWithInviteDto } from './dto/signup-with-invite.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(dto: LoginDto): Promise<LoginResponseDto>;
    signupWithInvite(dto: SignupWithInviteDto): Promise<LoginResponseDto>;
    logout(): Promise<{
        message: string;
    }>;
}
