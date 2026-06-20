import { Entity, PrimaryColumn, Column } from 'typeorm';
import { uuidBinaryTransformer } from '../../../common/base.entity';

@Entity('task_time_entries')
export class TaskTimeEntryEntity {
  @PrimaryColumn({ type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  id!: string;

  @Column({ name: 'task_id', type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  taskId!: string;

  @Column({ name: 'organization_id', type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  organizationId!: string;

  @Column({ name: 'user_id', type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  userId!: string;

  @Column({ type: 'int' })
  minutes!: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  note!: string | null;

  @Column({ name: 'logged_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  loggedAt!: Date;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
}
