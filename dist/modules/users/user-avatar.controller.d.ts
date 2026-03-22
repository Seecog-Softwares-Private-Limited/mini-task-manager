import { UsersService } from './users.service';
import { UserResponseDto } from './dto/user-response.dto';
interface MulterMemoryFile {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
}
export declare class UserAvatarController {
    private readonly usersService;
    constructor(usersService: UsersService);
    uploadMyAvatar(userId: string, file: MulterMemoryFile | undefined): Promise<UserResponseDto>;
    deleteMyAvatar(userId: string): Promise<{
        success: boolean;
    }>;
}
export {};
