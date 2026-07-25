import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { uuidBinaryTransformer, BaseEntity } from '../../../common/base.entity';
import { TaskEntity } from './task.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { OrganizationEntity } from '../../organizations/entities/organization.entity';

@Entity('subtask_comments')
export class SubtaskCommentEntity extends BaseEntity {
  @PrimaryColumn({ type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  id!: string;

  @Column({ name: 'organization_id', type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  organizationId!: string;

  @Column({ name: 'task_id', type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  taskId!: string;

  @Column({ name: 'subtask_id', type: 'varchar', length: 36 })
  subtaskId!: string;

  @Column({ name: 'user_id', type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  userId!: string;

  @Column({ type: 'varchar', length: 2000 })
  body!: string;

  @Column({
    name: 'parent_id',
    type: 'binary',
    length: 16,
    transformer: uuidBinaryTransformer,
    nullable: true,
  })
  parentId!: string | null;

  @ManyToOne(() => OrganizationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization?: OrganizationEntity;

  @ManyToOne(() => TaskEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task?: TaskEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @ManyToOne(() => SubtaskCommentEntity, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent?: SubtaskCommentEntity | null;
}
