import {
  Controller,
  Post,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SkipThrottle } from '@nestjs/throttler';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUserId } from '../../common/decorators/current-user.decorator';
import { UserResponseDto } from './dto/user-response.dto';

interface MulterMemoryFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

function toUserDto(user: {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  isEmailVerified: boolean;
  isActive: boolean;
}): UserResponseDto {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    avatarUrl: user.avatarUrl ?? undefined,
    isEmailVerified: user.isEmailVerified,
    isActive: user.isActive,
  };
}

/**
 * Dedicated controller so POST/DELETE /users/me/avatar always register as full paths
 * (avoids any router ordering issues with @Get('users/:id')).
 */
@Controller('users/me/avatar')
@SkipThrottle({ auth: true })
@UseGuards(JwtAuthGuard)
export class UserAvatarController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 2 * 1024 * 1024 } }),
  )
  async uploadMyAvatar(
    @CurrentUserId() userId: string,
    @UploadedFile() file: MulterMemoryFile | undefined,
  ): Promise<UserResponseDto> {
    if (!file?.buffer) {
      throw new BadRequestException('file is required');
    }
    const updated = await this.usersService.uploadAvatar(userId, file);
    return toUserDto(updated);
  }

  @Delete()
  async deleteMyAvatar(
    @CurrentUserId() userId: string,
  ): Promise<{ success: boolean }> {
    await this.usersService.clearAvatar(userId);
    return { success: true };
  }
}
