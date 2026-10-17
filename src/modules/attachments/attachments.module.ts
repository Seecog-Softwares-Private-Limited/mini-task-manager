import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { TasksModule } from '../tasks/tasks.module';
import { PlansModule } from '../../plans/plans.module';
import { AttachmentEntity } from './entities/attachment.entity';
import { AttachmentsRepository } from './repositories/attachments.repository';
import { AttachmentsService } from './attachments.service';
import { AttachmentsController } from './attachments.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([AttachmentEntity]),
    forwardRef(() => AuthModule),
    forwardRef(() => BillingModule),
    forwardRef(() => OrganizationsModule),
    forwardRef(() => TasksModule),
    forwardRef(() => PlansModule),
  ],
  controllers: [AttachmentsController],
  providers: [AttachmentsRepository, AttachmentsService],
  exports: [AttachmentsService, AttachmentsRepository],
})
export class AttachmentsModule {}
