import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { OrganizationEntity } from './entities/organization.entity';
import { OrganizationMemberEntity } from './entities/organization-member.entity';
import { SSOConfigEntity } from './entities/sso-config.entity';
import { OrganizationsRepository } from './repositories/organizations.repository';
import { OrganizationMembersRepository } from './repositories/organization-members.repository';
import { ORGANIZATION_MEMBERS_REPOSITORY } from './repositories/organization-members.repository.interface';
import { SSOConfigRepository } from './repositories/sso-config.repository';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';
import { SSOController } from './sso.controller';
import { SSOService } from './sso.service';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrganizationEntity, OrganizationMemberEntity, SSOConfigEntity]),
    forwardRef(() => BillingModule),
    forwardRef(() => AuthModule),
  ],
  controllers: [OrganizationsController, SSOController],
  providers: [
    OrganizationsRepository,
    OrganizationMembersRepository,
    { provide: ORGANIZATION_MEMBERS_REPOSITORY, useClass: OrganizationMembersRepository },
    SSOConfigRepository,
    OrganizationsService,
    SSOService,
  ],
  exports: [
    OrganizationsService,
    OrganizationsRepository,
    OrganizationMembersRepository,
    ORGANIZATION_MEMBERS_REPOSITORY,
  ],
})
export class OrganizationsModule {}
