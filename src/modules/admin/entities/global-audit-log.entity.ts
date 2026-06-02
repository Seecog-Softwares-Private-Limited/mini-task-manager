import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity, uuidBinaryTransformer } from '../../../common/base.entity';

@Entity('global_audit_logs')
@Index('idx_global_audit_org_created', ['organizationId', 'createdAt'])
@Index('idx_global_audit_actor_created', ['actorUserId', 'createdAt'])
export class GlobalAuditLogEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id!: number;

  @Column({ name: 'organization_id', type: 'binary', length: 16, transformer: uuidBinaryTransformer, nullable: true })
  organizationId!: string | null;

  @Column({ name: 'actor_user_id', type: 'binary', length: 16, transformer: uuidBinaryTransformer, nullable: true })
  actorUserId!: string | null;

  @Column({ name: 'entity_type', type: 'varchar', length: 80 })
  entityType!: string;

  @Column({ name: 'entity_id', type: 'varchar', length: 120, nullable: true })
  entityId!: string | null;

  @Column({ name: 'action', type: 'varchar', length: 100 })
  action!: string;

  @Column({ name: 'metadata', type: 'json', nullable: true })
  metadata!: Record<string, unknown> | null;
}

