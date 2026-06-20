import { Entity, PrimaryColumn, Column } from 'typeorm';
import { uuidBinaryTransformer } from '../../../common/base.entity';

@Entity('organization_custom_roles')
export class OrganizationCustomRoleEntity {
  @PrimaryColumn({ type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  id!: string;

  @Column({ name: 'organization_id', type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  organizationId!: string;

  @Column({ name: 'role_key', type: 'varchar', length: 32 })
  roleKey!: string;

  @Column({ type: 'varchar', length: 64 })
  label!: string;

  @Column({ name: 'permissions_json', type: 'json' })
  permissionsJson!: Record<string, boolean>;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt!: Date;
}
