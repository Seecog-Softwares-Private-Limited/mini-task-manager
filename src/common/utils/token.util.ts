import { JwtService } from '@nestjs/jwt';

/**
 * Thin helpers around @nestjs/jwt for scripts/tests.
 * Production auth uses JwtModule + JwtStrategy in AuthModule.
 */
export function createTokenUtil(jwtService: JwtService) {
  return {
    generateToken(payload: Record<string, unknown>): string {
      return jwtService.sign(payload);
    },
    verifyToken<T extends object = Record<string, unknown>>(token: string): T {
      return jwtService.verify(token) as T;
    },
  };
}
