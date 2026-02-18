import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { InvitationsService } from '../invitations/invitations.service';
import { UserEntity } from '../users/entities/user.entity';
import { OrganizationMemberEntity } from '../organizations/entities/organization-member.entity';
import { OrganizationInvitationEntity } from '../invitations/entities/organization-invitation.entity';
import { generateUuid } from '../../common/utils/uuid.util';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { SignupWithInviteDto } from './dto/signup-with-invite.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @Inject(forwardRef(() => InvitationsService))
    private readonly invitationsService: InvitationsService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !(await this.usersService.validatePassword(user.id, dto.password))) {
      throw new UnauthorizedException('Invalid credentials');
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
    const hash = await bcrypt.hash(dto.password, 10);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const mgr = queryRunner.manager;

      await mgr.save(UserEntity, {
        id: userId,
        email,
        fullName: dto.fullName,
        passwordHash: hash,
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
    };
  }
}
