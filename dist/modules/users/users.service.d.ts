import { UsersRepository } from './repositories/users.repository';
import { UserEntity } from './entities/user.entity';
import { OrganizationsService } from '../organizations/organizations.service';
export declare class UsersService {
    private readonly usersRepository;
    private readonly organizationsService;
    constructor(usersRepository: UsersRepository, organizationsService: OrganizationsService);
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
    updatePassword(userId: string, passwordHash: string): Promise<void>;
    linkGoogleId(userId: string, googleId: string): Promise<void>;
}
