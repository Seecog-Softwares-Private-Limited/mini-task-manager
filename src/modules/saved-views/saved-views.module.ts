import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { SavedBoardViewEntity } from './entities/saved-board-view.entity';
import { SavedViewsRepository } from './saved-views.repository';
import { SavedViewsService } from './saved-views.service';
import { SavedViewsController } from './saved-views.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([SavedBoardViewEntity]),
    AuthModule,
    BillingModule,
    OrganizationsModule,
  ],
  controllers: [SavedViewsController],
  providers: [SavedViewsRepository, SavedViewsService],
  exports: [SavedViewsService],
})
export class SavedViewsModule {}
