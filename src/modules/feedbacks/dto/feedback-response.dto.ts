import type { FeedbackEntity, FeedbackMediaMeta } from '../entities/feedback.entity';

export class FeedbackMediaDto {
  id!: string;
  fileName!: string;
  mimeType!: string | null;
  fileSize!: number;
  url!: string;

  static fromMeta(feedbackId: string, meta: FeedbackMediaMeta): FeedbackMediaDto {
    const dto = new FeedbackMediaDto();
    dto.id = meta.id;
    dto.fileName = meta.fileName;
    dto.mimeType = meta.mimeType;
    dto.fileSize = meta.fileSize;
    dto.url = `/feedbacks/${feedbackId}/media/${meta.id}`;
    return dto;
  }
}

export class FeedbackResponseDto {
  id!: string;
  organizationId!: string;
  userId!: string;
  authorName!: string | null;
  title!: string;
  description!: string;
  media!: FeedbackMediaDto[];
  createdAt!: string;
  updatedAt!: string;

  static fromEntity(entity: FeedbackEntity): FeedbackResponseDto {
    const dto = new FeedbackResponseDto();
    dto.id = entity.id;
    dto.organizationId = entity.organizationId;
    dto.userId = entity.userId;
    dto.authorName = entity.user?.fullName ?? null;
    dto.title = entity.title;
    dto.description = entity.description;
    dto.media = (entity.media ?? []).map((m) => FeedbackMediaDto.fromMeta(entity.id, m));
    dto.createdAt = entity.createdAt.toISOString();
    dto.updatedAt = entity.updatedAt.toISOString();
    return dto;
  }
}
