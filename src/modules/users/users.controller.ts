import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  ForbiddenException,
  NotFoundException,
  StreamableFile,
  ParseUUIDPipe,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUserId } from '../../common/decorators/current-user.decorator';
import { UserResponseDto } from './dto/user-response.dto';
import { Public } from '../../common/decorators/public.decorator';

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

@Controller('users')
@SkipThrottle({ auth: true })
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me/onboarding-status')
  async getOnboardingStatus(@CurrentUserId() userId: string) {
    return this.usersService.getOnboardingStatus(userId);
  }

  @Post('me/onboarding-complete')
  async markOnboardingComplete(@CurrentUserId() userId: string) {
    await this.usersService.markOnboardingComplete(userId);
    return { success: true };
  }

  @Get('me')
  async getMe(@CurrentUserId() userId: string): Promise<UserResponseDto | null> {
    const user = await this.usersService.findById(userId);
    if (!user) return null;
    return toUserDto(user);
  }

  /** Public: browsers load <img src> without Authorization. */
  @Public()
  @SkipThrottle({ default: true })
  @Get('avatar/:userId')
  async serveAvatar(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<StreamableFile> {
    const result = await this.usersService.getAvatarStream(userId);
    if (!result) throw new NotFoundException('Avatar not found');
    return new StreamableFile(result.stream, {
      type: result.contentType,
      disposition: 'inline; filename="avatar"',
    });
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUserId() currentUserId: string,
  ): Promise<UserResponseDto | null> {
    if (id !== currentUserId) {
      throw new ForbiddenException('You may only access your own profile');
    }
    const user = await this.usersService.findById(id);
    if (!user) return null;
    return toUserDto(user);
  }
}
