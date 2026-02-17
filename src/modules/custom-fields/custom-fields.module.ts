import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { ProjectsModule } from '../projects/projects.module';
import { CustomFieldEntity } from './entities/custom-field.entity';
import { TaskCustomFieldValueEntity } from './entities/task-custom-field-value.entity';
import { CustomFieldsRepository } from './repositories/custom-fields.repository';
import { TaskCustomFieldValuesRepository } from './repositories/task-custom-field-values.repository';
import { CustomFieldsService } from './custom-fields.service';
import { CustomFieldsController } from './custom-fields.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([CustomFieldEntity, TaskCustomFieldValueEntity]),
    AuthModule,
    OrganizationsModule,
    ProjectsModule,
  ],
  controllers: [CustomFieldsController],
  providers: [CustomFieldsRepository, TaskCustomFieldValuesRepository, CustomFieldsService],
  exports: [CustomFieldsService, CustomFieldsRepository],
})
export class CustomFieldsModule {}
