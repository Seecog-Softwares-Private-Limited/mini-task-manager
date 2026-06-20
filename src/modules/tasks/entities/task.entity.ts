import { Entity, PrimaryColumn, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { uuidBinaryTransformer } from '../../../common/base.entity';
import { BaseEntity } from '../../../common/base.entity';
import { ProjectEntity } from '../../projects/entities/project.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { WorkflowStatusEntity } from '../../workflows/entities/workflow-status.entity';
import { SprintEntity } from '../../sprints/entities/sprint.entity';

@Entity('tasks')
@Index('idx_tasks_project_created', ['projectId', 'createdAt'])
@Index('idx_tasks_org_id', ['organizationId', 'id'])
export class TaskEntity extends BaseEntity {
  @PrimaryColumn({ type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  id!: string;

  @Column({ name: 'project_id', type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  projectId!: string;

  @Column({ name: 'organization_id', type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  organizationId!: string;

  @Column({ type: 'varchar', length: 300 })
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

  @Column({ type: 'simple-json', nullable: true })
  subtasks!: Array<{
    id: string;
    title: string;
    completed: boolean;
    description?: string;
    assigneeId?: string;
    dueDate?: string;
    dueTime?: string;
    status?: 'TODO' | 'IN_PROGRESS' | 'DONE';
    priority?: string;
    statusId?: string;
  }> | null;

  @Column({ name: 'reporter_id', type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  reporterId!: string;

  @Column({ name: 'parent_task_id', type: 'binary', length: 16, transformer: uuidBinaryTransformer, nullable: true })
  parentTaskId!: string | null;

  @Column({ name: 'story_points', type: 'int', nullable: true })
  storyPoints!: number | null;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate!: Date | null;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt!: Date | null;

  @Column({ name: 'estimated_minutes', type: 'int', nullable: true })
  estimatedMinutes!: number | null;

  @Column({ name: 'logged_minutes', type: 'int', default: 0 })
  loggedMinutes!: number;

  @Column({ name: 'sprint_id', type: 'binary', length: 16, transformer: uuidBinaryTransformer, nullable: true })
  sprintId!: string | null;

  @Column({ name: 'recurring_template_id', type: 'binary', length: 16, transformer: uuidBinaryTransformer, nullable: true })
  recurringTemplateId!: string | null;

  @Column({ name: 'recurrence_type', type: 'varchar', length: 20, nullable: true })
  recurrenceType!: string | null;

  @Column({ name: 'recurrence_sequence', type: 'int', nullable: true })
  recurrenceSequence!: number | null;

  @Column({ type: 'simple-json', nullable: true })
  tags!: Array<{ name: string; color: string }> | null;

  @ManyToOne(() => ProjectEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project?: ProjectEntity;

  @ManyToOne(() => WorkflowStatusEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'status_id' })
  status?: WorkflowStatusEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'assignee_id' })
  assignee?: UserEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'reporter_id' })
  reporter?: UserEntity;

  @ManyToOne(() => TaskEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'parent_task_id' })
  parentTask?: TaskEntity;

  @ManyToOne(() => SprintEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'sprint_id' })
  sprint?: SprintEntity;
}
