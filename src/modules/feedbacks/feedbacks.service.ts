import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Configuration } from '../../config/configuration';
import { generateUuid } from '../../common/utils/uuid.util';
import { findExistingUploadPath } from '../../common/utils/upload-path.util';
import { PaginationQueryDto, PaginatedResult, paginate } from '../../common/pagination';
import { FeedbackEntity, FeedbackMediaMeta } from './entities/feedback.entity';
import { FeedbacksRepository } from './repositories/feedbacks.repository';
import { FeedbackResponseDto } from './dto/feedback-response.dto';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 5;

interface MulterFile {
  originalname?: string;
  mimetype?: string;
  size: number;
  buffer: Buffer;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200) || 'file';
}

function isAllowedMime(mimetype: string): boolean {
  if (!mimetype) return false;
  const allowed = [
    'image/',
    'video/',
    'text/',
    'application/pdf',
    'application/json',
    'application/zip',
    'application/x-zip-compressed',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];
  return allowed.some((prefix) =>
    prefix.endsWith('/') ? mimetype.startsWith(prefix) : mimetype === prefix,
  );
}

@Injectable()
export class FeedbacksService {
  constructor(
    private readonly feedbacksRepository: FeedbacksRepository,
    private readonly configService: ConfigService<Configuration>,
  ) {}

  async findAllForSuperAdmin(
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<FeedbackResponseDto>> {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const [data, total] = await this.feedbacksRepository.findAll(page, limit);
    return paginate(
      data.map((item) =>
        FeedbackResponseDto.fromEntity(item, {
          mediaBasePath: `/super-admin/feedbacks/${item.id}/media`,
        }),
      ),
      total,
      page,
      limit,
    );
  }

  async findOneForSuperAdmin(id: string): Promise<FeedbackResponseDto> {
    const entity = await this.feedbacksRepository.findById(id);
    if (!entity) throw new NotFoundException('Feedback not found');
    return FeedbackResponseDto.fromEntity(entity, {
      mediaBasePath: `/super-admin/feedbacks/${entity.id}/media`,
    });
  }

  async create(
    organizationId: string,
    userId: string,
    title: string,
    description: string,
    files: MulterFile[] = [],
  ): Promise<FeedbackResponseDto> {
    const trimmedTitle = title?.trim() ?? '';
    const trimmedDescription = description?.trim() ?? '';
    if (!trimmedTitle) throw new BadRequestException('Title is required');
    if (!trimmedDescription) throw new BadRequestException('Description is required');
    if (trimmedTitle.length > 255) throw new BadRequestException('Title is too long');
    if (trimmedDescription.length > 10000) {
      throw new BadRequestException('Description is too long');
    }
    if (files.length > MAX_FILES) {
      throw new BadRequestException(`You can attach up to ${MAX_FILES} files`);
    }

    const feedbackId = generateUuid();
    const uploadsPath = this.configService.get('uploadsPath', { infer: true })!;
    const dir = path.join(uploadsPath, 'feedbacks', feedbackId);
    await fs.mkdir(dir, { recursive: true });

    const media: FeedbackMediaMeta[] = [];
    for (const file of files) {
      if (!file?.buffer?.length) continue;
      if (file.size > MAX_FILE_SIZE) {
        throw new BadRequestException('Each file must be 10MB or smaller');
      }
      if (!isAllowedMime(file.mimetype || '')) {
        throw new BadRequestException(`File type not allowed: ${file.originalname || 'file'}`);
      }

      const mediaId = generateUuid();
      const ext = path.extname(file.originalname || '') || '';
      const base = sanitizeFileName(path.basename(file.originalname || 'file', ext));
      const storedFileName = `${mediaId}-${base}${ext}`;
      const storageKey = path.join('feedbacks', feedbackId, storedFileName).replace(/\\/g, '/');
      await fs.writeFile(path.join(uploadsPath, storageKey), file.buffer);

      media.push({
        id: mediaId,
        fileName: file.originalname || storedFileName,
        mimeType: file.mimetype || null,
        fileSize: file.size,
        storageKey,
      });
    }

    const entity = await this.feedbacksRepository.create({
      id: feedbackId,
      organizationId,
      userId,
      title: trimmedTitle,
      description: trimmedDescription,
      media: media.length > 0 ? media : null,
    });

    return FeedbackResponseDto.fromEntity(entity);
  }

  async getMediaFileForSuperAdmin(
    feedbackId: string,
    mediaId: string,
  ): Promise<{ path: string; fileName: string; mimeType: string | null }> {
    const entity = await this.feedbacksRepository.findById(feedbackId);
    if (!entity) throw new NotFoundException('Feedback not found');

    const meta = (entity.media ?? []).find((m) => m.id === mediaId);
    if (!meta) throw new NotFoundException('Media not found');

    const uploadsPath = this.configService.get('uploadsPath', { infer: true })!;
    const fullPath = await findExistingUploadPath(uploadsPath, meta.storageKey);

    return {
      path: fullPath,
      fileName: meta.fileName,
      mimeType: meta.mimeType,
    };
  }
}
