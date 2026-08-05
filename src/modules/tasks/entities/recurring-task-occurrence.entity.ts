import { Entity, PrimaryColumn, Column, Index } from 'typeorm';
import { BaseEntity, uuidBinaryTransformer } from '../../../common/base.entity';

@Entity('recurring_task_occurrences')
@Index('idx_recurring_occ_tpl_due', ['templateId', 'dueDate'])
@Index('idx_recurring_occ_task', ['taskId'])
@Index('idx_recurring_occ_org_project_state', ['organizationId', 'projectId', 'state'])
export class RecurringTaskOccurrenceEntity extends BaseEntity {
  @PrimaryColumn({ type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  id!: string;

  @Column({ name: 'template_id', type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  templateId!: string;

  @Column({ name: 'organization_id', type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  organizationId!: string;

  @Column({ name: 'project_id', type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  projectId!: string;

  @Column({ name: 'task_id', type: 'binary', length: 16, transformer: uuidBinaryTransformer, nullable: true })
  taskId!: string | null;

  @Column({ name: 'sequence_number', type: 'int' })
  sequenceNumber!: number;

  @Column({ name: 'due_date', type: 'date' })
  dueDate!: Date;

  @Column({ name: 'state', type: 'varchar', length: 20, default: 'PENDING' })
  state!: string;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt!: Date | null;

  /** Set when a due-time reminder was pushed to checklist assignees. */
  @Column({ name: 'reminder_sent_at', type: 'timestamp', nullable: true })
  reminderSentAt!: Date | null;

  /** Keys already notified, e.g. `ritual` or `subtask:<id>`. */
  @Column({ name: 'reminders_sent', type: 'simple-json', nullable: true })
  remindersSent!: string[] | null;
}

