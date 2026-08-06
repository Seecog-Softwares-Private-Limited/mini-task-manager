import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SkipThrottle } from '@nestjs/throttler';
import { createReadStream } from 'fs';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUserId } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AttachmentsService } from './attachments.service';
import { AttachmentResponseDto } from './dto/attachment-response.dto';
import { MirrorBlobDto } from './dto/mirror-blob.dto';
import type { AttachmentEntityType } from './entities/attachment.entity';

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Controller('attachments')
@SkipThrottle({ auth: true })
@UseGuards(JwtAuthGuard, TenantGuard)
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  /**
   * Local Nest → production: copy attachment bytes so mobile (VPS) can preview
   * files uploaded via localhost web while sharing the same DB.
   */
  @Public()
  @Post('mirror-blob')
  async mirrorBlob(
    @Headers('x-uploads-mirror-secret') secret: string | undefined,
    @Body() body: MirrorBlobDto,
  ): Promise<{ ok: true }> {
    return this.attachmentsService.acceptMirroredUpload(
      secret,
      body.storageKey,
      body.contentBase64,
    );
  }

  /**
   * Canonical host → peer: serve bytes so a host missing the file can pull it.
   */
  @Public()
  @Get('mirror-fetch')
  async mirrorFetch(
    @Headers('x-uploads-mirror-secret') secret: string | undefined,
    @Query('storageKey') storageKey: string,
  ): Promise<{ storageKey: string; contentBase64: string }> {
    if (!storageKey?.trim()) {
      throw new BadRequestException('storageKey is required');
    }
    return this.attachmentsService.provideMirroredUpload(secret, storageKey);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async upload(
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @UploadedFile() file: MulterFile | undefined,
    @Body('entityType') entityType: string,
    @Body('entityId') entityId: string,
    @Body('taskId') taskId?: string,
  ): Promise<AttachmentResponseDto> {
    if (!file) throw new BadRequestException('File is required');
    if (!entityType || !entityId) {
      throw new BadRequestException('entityType and entityId are required');
    }
    const normalizedType = entityType.toUpperCase();
    if (
      normalizedType !== 'TASK' &&
      normalizedType !== 'SUBTASK' &&
      normalizedType !== 'SUBTASK_COMMENT'
    ) {
      throw new BadRequestException('entityType must be TASK, SUBTASK, or SUBTASK_COMMENT');
    }
    const attachment = await this.attachmentsService.upload(
      normalizedType as AttachmentEntityType,
      entityId,
      tenantId,
      userId,
      file,
      taskId,
    );
    return AttachmentResponseDto.fromEntity(attachment);
  }

  @Get('entity/:entityType/:entityId')
  async listByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @TenantId() tenantId: string,
    @Query('taskId') taskId?: string,
  ): Promise<AttachmentResponseDto[]> {
    const normalizedType = entityType.toUpperCase();
    if (
      normalizedType !== 'TASK' &&
      normalizedType !== 'SUBTASK' &&
      normalizedType !== 'SUBTASK_COMMENT'
    ) {
      throw new BadRequestException('entityType must be TASK, SUBTASK, or SUBTASK_COMMENT');
    }
    const items = await this.attachmentsService.findByEntity(
      normalizedType as AttachmentEntityType,
      entityId,
      tenantId,
      taskId,
    );
    return items.map(AttachmentResponseDto.fromEntity);
  }

  @Get(':id/preview-rendered')
  async previewRendered(
    @Param('id') id: string,
    @TenantId() tenantId: string,
  ) {
    return this.attachmentsService.getRenderedPreview(id, tenantId);
  }

  @Get(':id/preview')
  async preview(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile | { message: string; fileName: string | null }> {
    const info = await this.attachmentsService.getPreviewInfo(id, tenantId);
    if (info.kind === 'unsupported') {
      return {
        message: 'Preview is not available for this file type.',
        fileName: info.fileName,
      };
    }
    if (info.mimeType) {
      res.setHeader('Content-Type', info.mimeType);
    }
    res.setHeader('Content-Disposition', `inline; filename="${info.fileName ?? 'preview'}"`);
    const stream = createReadStream(info.path);
    return new StreamableFile(stream);
  }

  @Get(':id/download')
  async download(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { path: filePath, fileName, mimeType } = await this.attachmentsService.getFileForDownload(
      id,
      tenantId,
    );
    if (mimeType) {
      res.setHeader('Content-Type', mimeType);
    }
    res.setHeader('Content-Disposition', `attachment; filename="${fileName ?? 'download'}"`);
    const stream = createReadStream(filePath);
    return new StreamableFile(stream);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
  ): Promise<{ success: boolean }> {
    await this.attachmentsService.delete(id, tenantId, userId);
    return { success: true };
  }
}
