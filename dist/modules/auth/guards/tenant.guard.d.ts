import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IOrganizationMembersRepository } from '../../organizations/repositories/organization-members.repository.interface';
export declare class TenantGuard implements CanActivate {
    private reflector;
    private readonly orgMembersRepo;
    constructor(reflector: Reflector, orgMembersRepo: IOrganizationMembersRepository);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
