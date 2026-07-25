import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { uuidBinaryTransformer, BaseEntity } from '../../../common/base.entity';
import { ProjectEntity } from '../../projects/entities/project.entity';
import { TaskEntity } from '../../tasks/entities/task.entity';
import { UserEntity } from '../../users/entities/user.entity';

export type AttachmentEntityType = 'TASK' | 'SUBTASK' | 'SUBTASK_COMMENT';

@Entity('attachments')
export class AttachmentEntity extends BaseEntity {
  @PrimaryColumn({ type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  id!: string;

  @Column({ name: 'workspace_id', type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  workspaceId!: string;

  @Column({ name: 'project_id', type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  projectId!: string;

  @Column({ name: 'task_id', type: 'binary', length: 16, transformer: uuidBinaryTransformer, nullable: true })
  taskId!: string | null;

  @Column({ name: 'entity_type', type: 'varchar', length: 20 })
  entityType!: AttachmentEntityType;

  @Column({ name: 'entity_id', type: 'varchar', length: 36 })
  entityId!: string;

  @Column({ name: 'original_file_name', type: 'varchar', length: 255, nullable: true })
  originalFileName!: string | null;

  @Column({ name: 'stored_file_name', type: 'varchar', length: 255 })
  storedFileName!: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 127, nullable: true })
  mimeType!: string | null;

  @Column({ name: 'file_extension', type: 'varchar', length: 32, nullable: true })
  fileExtension!: string | null;

  @Column({ name: 'file_size', type: 'bigint', nullable: true, default: 0 })
  fileSize!: number | null;

  @Column({ name: 'storage_provider', type: 'varchar', length: 32, default: 'local' })
  storageProvider!: string;

  @Column({ name: 'storage_key', type: 'text' })
  storageKey!: string;

  @Column({ name: 'thumbnail_url', type: 'text', nullable: true })
  thumbnailUrl!: string | null;

  @Column({ name: 'preview_url', type: 'text', nullable: true })
  previewUrl!: string | null;

  @Column({ name: 'uploaded_by', type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  uploadedBy!: string;

  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted!: boolean;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt!: Date | null;

  @ManyToOne(() => ProjectEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project?: ProjectEntity;

  @ManyToOne(() => TaskEntity, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'task_id' })
  task?: TaskEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'uploaded_by' })
  uploader?: UserEntity;
}
