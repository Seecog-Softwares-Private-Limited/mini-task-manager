import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationEntity } from './entities/organization.entity';
import { OrganizationMemberEntity } from './entities/organization-member.entity';
import { OrganizationsRepository } from './repositories/organizations.repository';
import { OrganizationMembersRepository } from './repositories/organization-members.repository';
import { ORGANIZATION_MEMBERS_REPOSITORY } from './repositories/organization-members.repository.interface';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrganizationEntity, OrganizationMemberEntity]),
  ],
  controllers: [OrganizationsController],
  providers: [
    OrganizationsRepository,
    OrganizationMembersRepository,
    { provide: ORGANIZATION_MEMBERS_REPOSITORY, useClass: OrganizationMembersRepository },
    OrganizationsService,
  ],
  exports: [OrganizationsService, OrganizationMembersRepository, ORGANIZATION_MEMBERS_REPOSITORY],
})
export class OrganizationsModule {}
