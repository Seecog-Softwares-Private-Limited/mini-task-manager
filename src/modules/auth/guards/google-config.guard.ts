import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Response } from 'express';
import { getFrontendUrl } from '../../../common/utils/frontend-url.util';

@Injectable()
export class GoogleConfigGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      return true;
    }
    const response = context.switchToHttp().getResponse<Response>();
    const frontendUrl = getFrontendUrl();
    response.redirect(302, `${frontendUrl}/login?error=google_not_configured`);
    return false;
  }
}
