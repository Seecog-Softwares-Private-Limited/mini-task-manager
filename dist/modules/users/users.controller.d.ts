import { StreamableFile } from '@nestjs/common';
import { UsersService } from './users.service';
import { UserResponseDto } from './dto/user-response.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getOnboardingStatus(userId: string): Promise<{
        hasOrganizations: boolean;
        onboardingCompletedAt: string | null;
    }>;
    markOnboardingComplete(userId: string): Promise<{
        success: boolean;
    }>;
    getMe(userId: string): Promise<UserResponseDto | null>;
    serveAvatar(userId: string): Promise<StreamableFile>;
    findOne(id: string, currentUserId: string): Promise<UserResponseDto | null>;
}
