import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsageService } from '../usage.service';
export declare class SubscriptionGuard implements CanActivate {
    private readonly reflector;
    private readonly usageService;
    constructor(reflector: Reflector, usageService: UsageService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
