import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Configuration } from '../../../config/configuration';
import { AuthService } from '../auth.service';

export interface JwtPayload {
  sub: string;
  email: string;
  roles?: string[];
  actorUserId?: string;
  impersonationSessionId?: string;
  impersonating?: boolean;
  targetOrganizationId?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly config: ConfigService<Configuration>,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('jwt.secret', { infer: true }),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.authService.validateUserById(payload.sub);
    if (!user) throw new UnauthorizedException();
    return {
      userId: user.id,
      email: user.email,
      roles: payload.roles ?? [],
      actorUserId: payload.actorUserId,
      impersonating: payload.impersonating ?? false,
      impersonationSessionId: payload.impersonationSessionId,
      targetOrganizationId: payload.targetOrganizationId,
    };
  }
}
