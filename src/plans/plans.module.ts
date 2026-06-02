import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../modules/users/entities/user.entity';
import { OrganizationEntity } from '../modules/organizations/entities/organization.entity';
import { OrganizationMemberEntity } from '../modules/organizations/entities/organization-member.entity';
import { OrganizationInvitationEntity } from '../modules/invitations/entities/organization-invitation.entity';
import { OrganizationsRepository } from '../modules/organizations/repositories/organizations.repository';
import { OrganizationMembersRepository } from '../modules/organizations/repositories/organization-members.repository';
import { PlansController } from './plans.controller';
import { PlanLimitService } from './plan-limit.service';
import { PlansService } from './plans.service';
import { PaymentService } from './payment.service';
import { PlanExpiryCronService } from './plan-expiry.cron';
import { PlanConfigurationEntity } from './entities/plan-configuration.entity';
import { PlanConfigurationsRepository } from './repositories/plan-configurations.repository';
import { PlanConfigurationsService } from './plan-configurations.service';
import { PlanConfigurationsController } from './plan-configurations.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      OrganizationEntity,
      OrganizationMemberEntity,
      OrganizationInvitationEntity,
      PlanConfigurationEntity,
    ]),
  ],
  controllers: [PlansController, PlanConfigurationsController],
  providers: [
    OrganizationsRepository,
    OrganizationMembersRepository,
    PlanConfigurationsRepository,
    PlanConfigurationsService,
    PlanLimitService,
    PlansService,
    PaymentService,
    PlanExpiryCronService,
  ],
  exports: [PlanLimitService, PlansService, PaymentService, PlanConfigurationsService],
})
export class PlansModule {}
