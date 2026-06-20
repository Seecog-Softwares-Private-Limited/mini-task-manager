import { Entity, PrimaryColumn, Column } from 'typeorm';
import { uuidBinaryTransformer } from '../../../common/base.entity';

@Entity('automation_rules')
export class AutomationRuleEntity {
  @PrimaryColumn({ type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  id!: string;

  @Column({ name: 'organization_id', type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  organizationId!: string;

  @Column({ name: 'project_id', type: 'binary', length: 16, transformer: uuidBinaryTransformer, nullable: true })
  projectId!: string | null;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ name: 'trigger_type', type: 'varchar', length: 64 })
  triggerType!: string;

  @Column({ name: 'trigger_config_json', type: 'json', nullable: true })
  triggerConfigJson!: Record<string, unknown> | null;

  @Column({ name: 'action_type', type: 'varchar', length: 64 })
  actionType!: string;

  @Column({ name: 'action_config_json', type: 'json' })
  actionConfigJson!: Record<string, unknown>;

  @Column({ name: 'is_enabled', type: 'boolean', default: true })
  isEnabled!: boolean;

  @Column({ name: 'created_by', type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  createdBy!: string;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt!: Date;
}
