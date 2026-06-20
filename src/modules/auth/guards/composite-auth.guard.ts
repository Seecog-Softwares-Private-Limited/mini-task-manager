import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';
import { ApiKeysService } from '../../api-keys/api-keys.service';

const API_KEY_PREFIX = 'mtm_';

@Injectable()
export class CompositeAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    private readonly apiKeysService: ApiKeysService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      user?: Record<string, unknown>;
    }>();

    const authHeader = request.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : null;

    if (token?.startsWith(API_KEY_PREFIX)) {
      const ctx = await this.apiKeysService.authenticateRawKey(token);
      if (!ctx) throw new UnauthorizedException('Invalid API key');
      request.user = {
        userId: ctx.createdBy,
        email: '',
        roles: ['member'],
        isApiKey: true,
        apiKeyId: ctx.id,
        apiKeyOrganizationId: ctx.organizationId,
      };
      return true;
    }

    const result = await super.canActivate(context);
    return result as boolean;
  }
}
