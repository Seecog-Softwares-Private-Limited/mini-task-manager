import { Entity, PrimaryColumn, Column } from 'typeorm';
import { uuidBinaryTransformer } from '../../../common/base.entity';

@Entity('organization_usage')
export class OrganizationUsageEntity {
  @PrimaryColumn({ name: 'organization_id', type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  organizationId!: string;

  @Column({ name: 'users_count', type: 'int', default: 0 })
  usersCount!: number;

  @Column({ name: 'projects_count', type: 'int', default: 0 })
  projectsCount!: number;

  @Column({ name: 'storage_used_mb', type: 'int', default: 0 })
  storageUsedMb!: number;

  @Column({ name: 'automation_used', type: 'int', default: 0 })
  automationUsed!: number;

  @Column({ name: 'integrations_used', type: 'int', default: 0 })
  integrationsUsed!: number;

  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt!: Date;
}
