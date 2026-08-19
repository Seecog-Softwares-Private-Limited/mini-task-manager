import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { uuidBinaryTransformer } from '../../../common/base.entity';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('notifications')
@Index('idx_notifications_user_created', ['userId', 'createdAt'])
export class NotificationEntity {
  @PrimaryColumn({ type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  id!: string;

  @Column({ name: 'user_id', type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  userId!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title!: string | null;

  @Column({ type: 'text', nullable: true })
  message!: string | null;

  /** Deep-link payload (taskId, subtaskId, type, projectId, …). */
  @Column({ type: 'json', nullable: true })
  data!: Record<string, string> | null;

  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead!: boolean;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;
}
