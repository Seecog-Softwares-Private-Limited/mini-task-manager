import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { OrganizationEntity } from './entities/organization.entity';
import { OrganizationMemberEntity } from './entities/organization-member.entity';
import { SSOConfigEntity } from './entities/sso-config.entity';
import { OrganizationCustomRoleEntity } from './entities/organization-custom-role.entity';
import { OrganizationsRepository } from './repositories/organizations.repository';
import { OrganizationMembersRepository } from './repositories/organization-members.repository';
import { ORGANIZATION_MEMBERS_REPOSITORY } from './repositories/organization-members.repository.interface';
import { SSOConfigRepository } from './repositories/sso-config.repository';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';
import { SSOController } from './sso.controller';
import { SSOService } from './sso.service';
import { CustomRolesRepository } from './repositories/custom-roles.repository';
import { CustomRolesService } from './custom-roles.service';
import { CustomRolesController } from './custom-roles.controller';
import { BillingModule } from '../billing/billing.module';
import { PlansModule } from '../../plans/plans.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrganizationEntity, OrganizationMemberEntity, SSOConfigEntity, OrganizationCustomRoleEntity]),
    forwardRef(() => BillingModule),
    forwardRef(() => AuthModule),
    forwardRef(() => PlansModule),
  ],
  controllers: [OrganizationsController, SSOController, CustomRolesController],
  providers: [
    OrganizationsRepository,
    OrganizationMembersRepository,
    { provide: ORGANIZATION_MEMBERS_REPOSITORY, useClass: OrganizationMembersRepository },
    SSOConfigRepository,
    CustomRolesRepository,
    OrganizationsService,
    SSOService,
    CustomRolesService,
  ],
  exports: [
    OrganizationsService,
    OrganizationsRepository,
    OrganizationMembersRepository,
    ORGANIZATION_MEMBERS_REPOSITORY,
    SSOConfigRepository,
    CustomRolesService,
  ],
})
export class OrganizationsModule {}
