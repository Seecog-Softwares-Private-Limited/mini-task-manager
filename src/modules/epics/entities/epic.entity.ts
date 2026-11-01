import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { uuidBinaryTransformer } from '../../../common/base.entity';
import { BaseEntity } from '../../../common/base.entity';
import { OrganizationEntity } from '../../organizations/entities/organization.entity';
import { ProjectEntity } from '../../projects/entities/project.entity';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('epics')
@Index('idx_epics_project_status', ['projectId', 'status'])
export class EpicEntity extends BaseEntity {
  @PrimaryColumn({ type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  id!: string;

  @Column({ name: 'organization_id', type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  organizationId!: string;

  @Column({ name: 'project_id', type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  projectId!: string;

  @Column({ type: 'varchar', length: 300 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  color!: string | null;

  @Column({ type: 'varchar', length: 50, default: 'TODO' })
  status!: string;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate!: Date | null;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate!: Date | null;

  @Column({ name: 'created_by', type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  createdBy!: string;

  @ManyToOne(() => OrganizationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization?: OrganizationEntity;

  @ManyToOne(() => ProjectEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project?: ProjectEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  creator?: UserEntity;
}
