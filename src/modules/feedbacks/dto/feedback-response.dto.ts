import type { FeedbackEntity, FeedbackMediaMeta } from '../entities/feedback.entity';

export class FeedbackMediaDto {
  id!: string;
  fileName!: string;
  mimeType!: string | null;
  fileSize!: number;
  url!: string;

  static fromMeta(
    feedbackId: string,
    meta: FeedbackMediaMeta,
    mediaBasePath = `/feedbacks/${feedbackId}/media`,
  ): FeedbackMediaDto {
    const dto = new FeedbackMediaDto();
    dto.id = meta.id;
    dto.fileName = meta.fileName;
    dto.mimeType = meta.mimeType;
    dto.fileSize = meta.fileSize;
    dto.url = `${mediaBasePath}/${meta.id}`;
    return dto;
  }
}

export class FeedbackResponseDto {
  id!: string;
  organizationId!: string;
  organizationName!: string | null;
  userId!: string;
  authorName!: string | null;
  authorEmail!: string | null;
  title!: string;
  description!: string;
  media!: FeedbackMediaDto[];
  createdAt!: string;
  updatedAt!: string;

  static fromEntity(
    entity: FeedbackEntity,
    options?: { mediaBasePath?: string },
  ): FeedbackResponseDto {
    const dto = new FeedbackResponseDto();
    dto.id = entity.id;
    dto.organizationId = entity.organizationId;
    dto.organizationName = entity.organization?.name ?? null;
    dto.userId = entity.userId;
    dto.authorName = entity.user?.fullName ?? null;
    dto.authorEmail = entity.user?.email ?? null;
    dto.title = entity.title;
    dto.description = entity.description;
    const mediaBasePath =
      options?.mediaBasePath ?? `/feedbacks/${entity.id}/media`;
    dto.media = (entity.media ?? []).map((m) =>
      FeedbackMediaDto.fromMeta(entity.id, m, mediaBasePath),
    );
    dto.createdAt = entity.createdAt.toISOString();
    dto.updatedAt = entity.updatedAt.toISOString();
    return dto;
  }
}
