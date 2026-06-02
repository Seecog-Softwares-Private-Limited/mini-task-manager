import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity, uuidBinaryTransformer } from '../../../common/base.entity';

@Entity('tenant_usage')
@Index('idx_tenant_usage_org_period', ['organizationId', 'periodDate'], { unique: true })
export class TenantUsageEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id!: number;

  @Column({ name: 'organization_id', type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  organizationId!: string;

  @Column({ name: 'period_date', type: 'date' })
  periodDate!: Date;

  @Column({ name: 'users_count', type: 'int', unsigned: true, default: 0 })
  usersCount!: number;

  @Column({ name: 'workspaces_count', type: 'int', unsigned: true, default: 0 })
  workspacesCount!: number;

  @Column({ name: 'projects_count', type: 'int', unsigned: true, default: 0 })
  projectsCount!: number;

  @Column({ name: 'tasks_count', type: 'int', unsigned: true, default: 0 })
  tasksCount!: number;

  @Column({ name: 'storage_used_bytes', type: 'bigint', unsigned: true, default: 0 })
  storageUsedBytes!: string;
}

