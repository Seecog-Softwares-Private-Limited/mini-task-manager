import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { SkipThrottle } from '@nestjs/throttler';
import { createReadStream } from 'fs';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUserId } from '../../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../common/pagination';
import { FeedbacksService } from './feedbacks.service';
import { FeedbackResponseDto } from './dto/feedback-response.dto';

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Controller('feedbacks')
@SkipThrottle({ auth: true })
@UseGuards(JwtAuthGuard, TenantGuard)
export class FeedbacksController {
  constructor(private readonly feedbacksService: FeedbacksService) {}

  @Get()
  async findAll(
    @TenantId() tenantId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.feedbacksService.findAll(tenantId, query);
  }

  @Get(':id/media/:mediaId')
  async downloadMedia(
    @Param('id') id: string,
    @Param('mediaId') mediaId: string,
    @TenantId() tenantId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const file = await this.feedbacksService.getMediaFile(id, mediaId, tenantId);
    if (file.mimeType) res.setHeader('Content-Type', file.mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(file.fileName)}"`,
    );
    return new StreamableFile(createReadStream(file.path));
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @TenantId() tenantId: string,
  ): Promise<FeedbackResponseDto> {
    return this.feedbacksService.findOne(id, tenantId);
  }

  @Post()
  @UseInterceptors(FilesInterceptor('files', 5, { limits: { fileSize: 10 * 1024 * 1024 } }))
  async create(
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Body('title') title: string,
    @Body('description') description: string,
    @UploadedFiles() files: MulterFile[] | undefined,
  ): Promise<FeedbackResponseDto> {
    if (!title?.trim() || !description?.trim()) {
      throw new BadRequestException('Title and description are required');
    }
    return this.feedbacksService.create(
      tenantId,
      userId,
      title,
      description,
      files ?? [],
    );
  }
}
