import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity, uuidBinaryTransformer } from '../../../common/base.entity';
import { OrganizationEntity } from '../../organizations/entities/organization.entity';
import { ProjectEntity } from '../../projects/entities/project.entity';
import { TaskEntity } from '../../tasks/entities/task.entity';
import { UserEntity } from '../../users/entities/user.entity';

export type IssueSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IssueStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type IssueSource = 'MANUAL' | 'AUTO_CHECK_FAILED' | 'AUTO_READING_OUT_OF_RANGE';

@Entity('issues')
@Index('idx_issues_org_status', ['organizationId', 'status'])
@Index('idx_issues_project_status', ['projectId', 'status'])
@Index('idx_issues_task', ['taskId'])
export class IssueEntity extends BaseEntity {
  @PrimaryColumn({ type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  id!: string;

  @Column({ name: 'organization_id', type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  organizationId!: string;

  @Column({ name: 'project_id', type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  projectId!: string;

  /**
   * No FK (yet) - the `sites` table (multi-industry phase 2) isn't merged to
   * main at the time this phase was built. Plain nullable column so a site_id
   * can be set once that lands, without this phase depending on it.
   */
  @Column({ name: 'site_id', type: 'binary', length: 16, nullable: true, transformer: uuidBinaryTransformer })
  siteId!: string | null;

  @Column({ name: 'task_id', type: 'binary', length: 16, nullable: true, transformer: uuidBinaryTransformer })
  taskId!: string | null;

  /** Checklist item id (plain uuid stored in the task's subtasks JSON, not a FK). */
  @Column({ name: 'subtask_id', type: 'varchar', length: 64, nullable: true })
  subtaskId!: string | null;

  @Column({ type: 'varchar', length: 300 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'MEDIUM' })
  severity!: IssueSeverity;

  @Column({ type: 'varchar', length: 20, default: 'OPEN' })
  status!: IssueStatus;

  /** How this issue came to exist - raised by hand, or auto-raised from a failed checklist item. */
  @Column({ type: 'varchar', length: 30, default: 'MANUAL' })
  source!: IssueSource;

  @Column({ name: 'raised_by', type: 'binary', length: 16, nullable: true, transformer: uuidBinaryTransformer })
  raisedBy!: string | null;

  @Column({ name: 'assignee_id', type: 'binary', length: 16, nullable: true, transformer: uuidBinaryTransformer })
  assigneeId!: string | null;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt!: Date | null;

  @Column({ name: 'resolved_by', type: 'binary', length: 16, nullable: true, transformer: uuidBinaryTransformer })
  resolvedBy!: string | null;

  @Column({ name: 'resolution_note', type: 'text', nullable: true })
  resolutionNote!: string | null;

  @ManyToOne(() => OrganizationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization?: OrganizationEntity;

  @ManyToOne(() => ProjectEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project?: ProjectEntity;

  @ManyToOne(() => TaskEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'task_id' })
  task?: TaskEntity | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'raised_by' })
  raiser?: UserEntity | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assignee_id' })
  assignee?: UserEntity | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'resolved_by' })
  resolver?: UserEntity | null;
}
