import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { UsersService } from '../../users/users.service';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ user?: { userId: string } }>();
    const userId = request.user?.userId;
    if (!userId) {
      throw new ForbiddenException('Authentication required');
    }
    const isAdmin = await this.usersService.isPlatformAdmin(userId);
    if (!isAdmin) {
      throw new ForbiddenException('Platform administrator access required');
    }
    return true;
  }
}
