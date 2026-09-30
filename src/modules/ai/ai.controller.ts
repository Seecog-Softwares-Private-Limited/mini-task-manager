import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { CurrentUserId } from '../../common/decorators/current-user.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { SuggestSubtasksRequestDto } from './dto/suggest-subtasks-request.dto';
import { SubtaskSuggestionsResponseDto } from './dto/subtask-suggestions-response.dto';
import { SubtaskSuggestionsService } from './subtask-suggestions.service';

@Controller('ai')
@SkipThrottle({ auth: true })
@UseGuards(JwtAuthGuard, TenantGuard)
export class AiController {
  constructor(private readonly subtaskSuggestions: SubtaskSuggestionsService) {}

  @Post('subtask-suggestions')
  suggest(
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Body() dto: SuggestSubtasksRequestDto,
  ): Promise<SubtaskSuggestionsResponseDto> {
    return this.subtaskSuggestions.suggest(tenantId, userId, dto);
  }
}
