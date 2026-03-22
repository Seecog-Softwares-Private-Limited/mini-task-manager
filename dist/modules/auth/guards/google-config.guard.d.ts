import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare class GoogleConfigGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean;
}
