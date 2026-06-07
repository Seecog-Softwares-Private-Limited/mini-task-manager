import { Entity, PrimaryColumn, Column, Index } from 'typeorm';
import { BaseEntity, uuidBinaryTransformer } from '../../../common/base.entity';

@Entity('recurring_task_templates')
@Index('idx_recurring_tpl_org_project', ['organizationId', 'projectId'])
@Index('idx_recurring_tpl_next_due', ['isPaused', 'nextDueDate'])
export class RecurringTaskTemplateEntity extends BaseEntity {
  @PrimaryColumn({ type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  id!: string;

  @Column({ name: 'organization_id', type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  organizationId!: string;

  @Column({ name: 'project_id', type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  projectId!: string;

  @Column({ name: 'created_by', type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  createdBy!: string;

  @Column({ name: 'title', type: 'varchar', length: 300 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'status_id', type: 'binary', length: 16, transformer: uuidBinaryTransformer, nullable: true })
  statusId!: string | null;

  @Column({ type: 'varchar', length: 50, default: 'MEDIUM' })
  priority!: string;

  @Column({ name: 'assignee_id', type: 'binary', length: 16, transformer: uuidBinaryTransformer, nullable: true })
  assigneeId!: string | null;

  @Column({ name: 'assignee_ids', type: 'simple-json', nullable: true })
  assigneeIds!: string[] | null;

  @Column({ name: 'story_points', type: 'int', nullable: true })
  storyPoints!: number | null;

  @Column({ name: 'template_subtasks', type: 'simple-json', nullable: true })
  templateSubtasks!: Array<{
    id: string;
    title: string;
    completed: boolean;
    description?: string;
    assigneeId?: string;
    dueDate?: string;
    priority?: string;
    statusId?: string;
  }> | null;

  @Column({ type: 'simple-json', nullable: true })
  tags!: Array<{ name: string; color: string }> | null;

  @Column({ name: 'repeat_type', type: 'varchar', length: 20 })
  repeatType!: string;

  @Column({ name: 'rule_config', type: 'simple-json', nullable: true })
  ruleConfig!: Record<string, unknown> | null;

  @Column({ name: 'create_days_before_due', type: 'int', default: 0 })
  createDaysBeforeDue!: number;

  @Column({ name: 'start_due_date', type: 'date' })
  startDueDate!: Date;

  @Column({ name: 'next_due_date', type: 'date' })
  nextDueDate!: Date;

  @Column({ name: 'last_generated_due_date', type: 'date', nullable: true })
  lastGeneratedDueDate!: Date | null;

  @Column({ name: 'last_sequence', type: 'int', default: 0 })
  lastSequence!: number;

  @Column({ name: 'generated_count', type: 'int', default: 0 })
  generatedCount!: number;

  @Column({ name: 'end_type', type: 'varchar', length: 20, default: 'NEVER' })
  endType!: string;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate!: Date | null;

  @Column({ name: 'end_after_occurrences', type: 'int', nullable: true })
  endAfterOccurrences!: number | null;

  @Column({ name: 'is_paused', type: 'tinyint', width: 1, default: 0 })
  isPaused!: boolean;

  @Column({ name: 'stopped_at', type: 'timestamp', nullable: true })
  stoppedAt!: Date | null;
}

