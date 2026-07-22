import {
  BadRequestException,
  Controller,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUserId } from '../../common/decorators/current-user.decorator';
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

/** Customer-facing: submit feedback only. Listing is super-admin only. */
@Controller('feedbacks')
@SkipThrottle({ auth: true })
@UseGuards(JwtAuthGuard, TenantGuard)
export class FeedbacksController {
  constructor(private readonly feedbacksService: FeedbacksService) {}

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
