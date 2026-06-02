import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity, uuidBinaryTransformer } from '../../../common/base.entity';

@Entity('impersonation_logs')
@Index('idx_impersonation_logs_admin_started', ['adminUserId', 'startedAt'])
export class ImpersonationLogEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id!: number;

  @Column({ name: 'session_id', type: 'varchar', length: 64, unique: true })
  sessionId!: string;

  @Column({ name: 'admin_user_id', type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  adminUserId!: string;

  @Column({ name: 'target_user_id', type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  targetUserId!: string;

  @Column({ name: 'target_organization_id', type: 'binary', length: 16, transformer: uuidBinaryTransformer, nullable: true })
  targetOrganizationId!: string | null;

  @Column({ name: 'reason', type: 'varchar', length: 300, nullable: true })
  reason!: string | null;

  @Column({ name: 'started_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  startedAt!: Date;

  @Column({ name: 'ended_at', type: 'timestamp', nullable: true })
  endedAt!: Date | null;
}

