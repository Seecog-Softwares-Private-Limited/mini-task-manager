import { formatUuid } from '../../../common/utils/uuid.util';
import { TaskAttachmentEntity } from '../entities/task-attachment.entity';

export class TaskAttachmentResponseDto {
  id!: string;
  taskId!: string;
  fileName!: string | null;
  fileUrl!: string;
  fileSizeBytes!: number | null;
  uploadedBy!: string;
  uploadedAt!: Date;

  static fromEntity(entity: TaskAttachmentEntity): TaskAttachmentResponseDto {
    return {
      id: formatUuid(entity.id) ?? String(entity.id),
      taskId: formatUuid(entity.taskId) ?? String(entity.taskId),
      fileName: entity.fileName,
      fileUrl: entity.fileUrl,
      fileSizeBytes:
        entity.fileSizeBytes == null ? null : Number(entity.fileSizeBytes),
      uploadedBy: formatUuid(entity.uploadedBy) ?? String(entity.uploadedBy),
      uploadedAt: entity.uploadedAt,
    };
  }
}
