import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { UsersService } from '../users/users.service';
import { InvitationsService } from '../invitations/invitations.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { SignupWithInviteDto } from './dto/signup-with-invite.dto';
export declare class AuthService {
    private readonly usersService;
    private readonly jwtService;
    private readonly invitationsService;
    private readonly dataSource;
    constructor(usersService: UsersService, jwtService: JwtService, invitationsService: InvitationsService, dataSource: DataSource);
    login(dto: LoginDto): Promise<LoginResponseDto>;
    validateUserById(userId: string): Promise<{
        id: string;
        email: string;
    } | null>;
    signupWithInvite(dto: SignupWithInviteDto): Promise<LoginResponseDto>;
}
