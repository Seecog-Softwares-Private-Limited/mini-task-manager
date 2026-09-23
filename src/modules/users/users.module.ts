import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { UsersRepository } from './repositories/users.repository';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UserAvatarController } from './user-avatar.controller';
import { OrganizationsModule } from '../organizations/organizations.module';
import { AccountDeletionService } from './account-deletion.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    OrganizationsModule,
  ],
  controllers: [UserAvatarController, UsersController],
  providers: [UsersRepository, UsersService, AccountDeletionService],
  exports: [UsersService, UsersRepository, AccountDeletionService],
})
export class UsersModule {}
