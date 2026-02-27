import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationInvitationEntity } from './entities/organization-invitation.entity';
import { InvitationsRepository } from './repositories/invitations.repository';
import { InvitationsService } from './invitations.service';
import { InvitationsController } from './invitations.controller';
import { EmailService } from './email.service';
import { AuthModule } from '../auth/auth.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { UsersModule } from '../users/users.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrganizationInvitationEntity]),
    forwardRef(() => AuthModule),
    OrganizationsModule,
    UsersModule,
    forwardRef(() => BillingModule),
  ],
  controllers: [InvitationsController],
  providers: [InvitationsRepository, InvitationsService, EmailService],
  exports: [InvitationsService, EmailService],
})
export class InvitationsModule {}
