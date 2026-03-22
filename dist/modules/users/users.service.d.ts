import { ConfigService } from '@nestjs/config';
import type { ReadStream } from 'fs';
import { UsersRepository } from './repositories/users.repository';
import { UserEntity } from './entities/user.entity';
import { OrganizationsService } from '../organizations/organizations.service';
import { Configuration } from '../../config/configuration';
export interface MulterFileLike {
    buffer: Buffer;
    mimetype: string;
    size: number;
    originalname?: string;
}
export declare class UsersService {
    private readonly usersRepository;
    private readonly organizationsService;
    private readonly configService;
    constructor(usersRepository: UsersRepository, organizationsService: OrganizationsService, configService: ConfigService<Configuration>);
    findById(id: string): Promise<UserEntity | null>;
    findByEmail(email: string): Promise<UserEntity | null>;
    findByGoogleId(googleId: string): Promise<UserEntity | null>;
    findByPhone(phone: string): Promise<UserEntity | null>;
    findByIdForAuth(id: string): Promise<{
        id: string;
        email: string;
    } | null>;
    validatePassword(userId: string, plainPassword: string): Promise<boolean>;
    create(data: {
        email: string;
        fullName: string;
        password: string;
    }): Promise<UserEntity>;
    deleteById(id: string): Promise<void>;
    getOnboardingStatus(userId: string): Promise<{
        hasOrganizations: boolean;
        onboardingCompletedAt: string | null;
    }>;
    markOnboardingComplete(userId: string): Promise<void>;
    updateEmailVerified(userId: string, verified: boolean): Promise<void>;
    updatePassword(userId: string, plainPassword: string): Promise<void>;
    linkGoogleId(userId: string, googleId: string): Promise<void>;
    private avatarPublicPath;
    uploadAvatar(userId: string, file: MulterFileLike): Promise<UserEntity>;
    clearAvatar(userId: string): Promise<void>;
    getAvatarStream(userId: string): Promise<{
        stream: ReadStream;
        contentType: string;
    } | null>;
}
