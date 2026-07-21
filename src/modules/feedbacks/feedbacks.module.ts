import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeedbackEntity } from './entities/feedback.entity';
import { FeedbacksRepository } from './repositories/feedbacks.repository';
import { FeedbacksService } from './feedbacks.service';
import { FeedbacksController } from './feedbacks.controller';

@Module({
  imports: [TypeOrmModule.forFeature([FeedbackEntity])],
  controllers: [FeedbacksController],
  providers: [FeedbacksRepository, FeedbacksService],
  exports: [FeedbacksService],
})
export class FeedbacksModule {}
