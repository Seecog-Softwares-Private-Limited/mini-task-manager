import { AttachmentEntity } from '../entities/attachment.entity';

export class AttachmentResponseDto {
  id!: string;
  workspaceId!: string;
  projectId!: string;
  taskId?: string | null;
  entityType!: string;
  entityId!: string;
  originalFileName!: string | null;
  storedFileName!: string;
  mimeType!: string | null;
  fileExtension!: string | null;
  fileSize!: number;
  storageProvider!: string;
  thumbnailUrl?: string | null;
  previewUrl?: string | null;
  uploadedBy!: string;
  createdAt!: Date;
  updatedAt!: Date;

  static fromEntity(entity: AttachmentEntity): AttachmentResponseDto {
    return {
      id: entity.id,
      workspaceId: entity.workspaceId,
      projectId: entity.projectId,
      taskId: entity.taskId,
      entityType: entity.entityType,
      entityId: entity.entityId,
      originalFileName: entity.originalFileName,
      storedFileName: entity.storedFileName,
      mimeType: entity.mimeType,
      fileExtension: entity.fileExtension,
      fileSize: Number(entity.fileSize ?? 0),
      storageProvider: entity.storageProvider,
      thumbnailUrl: entity.thumbnailUrl,
      previewUrl: entity.previewUrl,
      uploadedBy: entity.uploadedBy,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
