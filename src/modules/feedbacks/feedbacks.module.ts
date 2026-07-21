import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { FeedbackEntity } from './entities/feedback.entity';
import { FeedbacksRepository } from './repositories/feedbacks.repository';
import { FeedbacksService } from './feedbacks.service';
import { FeedbacksController } from './feedbacks.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([FeedbackEntity]),
    AuthModule,
    OrganizationsModule,
  ],
  controllers: [FeedbacksController],
  providers: [FeedbacksRepository, FeedbacksService],
  exports: [FeedbacksService],
})
export class FeedbacksModule {}
