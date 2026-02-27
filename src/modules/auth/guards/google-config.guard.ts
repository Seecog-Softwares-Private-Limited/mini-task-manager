import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Response } from 'express';

@Injectable()
export class GoogleConfigGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      return true;
    }
    const response = context.switchToHttp().getResponse<Response>();
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    response.redirect(302, `${frontendUrl}/login?error=google_not_configured`);
    return false;
  }
}
