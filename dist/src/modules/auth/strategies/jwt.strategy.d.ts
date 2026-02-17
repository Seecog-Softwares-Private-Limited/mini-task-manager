import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Configuration } from '../../../config/configuration';
import { AuthService } from '../auth.service';
export interface JwtPayload {
    sub: string;
    email: string;
}
declare const JwtStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly config;
    private readonly authService;
    constructor(config: ConfigService<Configuration>, authService: AuthService);
    validate(payload: JwtPayload): Promise<{
        userId: string;
        email: string;
    }>;
}
export {};
