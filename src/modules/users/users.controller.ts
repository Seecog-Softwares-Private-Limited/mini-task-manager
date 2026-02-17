import { Controller, Get, Param, UseGuards, ForbiddenException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUserId } from '../../common/decorators/current-user.decorator';
import { UserResponseDto } from './dto/user-response.dto';

@Controller('users')
@SkipThrottle({ auth: true })
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      avatarUrl: user.avatarUrl ?? undefined,
      isEmailVerified: user.isEmailVerified,
      isActive: user.isActive,
    };
  }
}
