import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { CurrentUserId } from '../../common/decorators/current-user.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { SuggestSubtasksRequestDto } from './dto/suggest-subtasks-request.dto';
import { SubtaskSuggestionsResponseDto } from './dto/subtask-suggestions-response.dto';
import { SubtaskSuggestionsService } from './subtask-suggestions.service';
import { AddSubtasksByTitleRequestDto } from './dto/add-subtasks-by-title-request.dto';
import { AddSubtasksByTitleResponseDto } from './dto/add-subtasks-by-title-response.dto';
import { AddSubtasksByTitleService } from './add-subtasks-by-title.service';

@Controller('ai')
@SkipThrottle({ auth: true })
@UseGuards(JwtAuthGuard, TenantGuard)
export class AiController {
  constructor(
    private readonly subtaskSuggestions: SubtaskSuggestionsService,
    private readonly addSubtasksByTitle: AddSubtasksByTitleService,
  ) {}

  @Post('subtask-suggestions')
  suggest(
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Body() dto: SuggestSubtasksRequestDto,
  ): Promise<SubtaskSuggestionsResponseDto> {
    return this.subtaskSuggestions.suggest(tenantId, userId, dto);
  }

  /**
   * Finds one task by its exact title (optionally narrowed by projectId) and
   * appends the given subtasks to it. Built for external tools / AI chatbots
   * that only know a task's title, not its id.
   */
  @Post('tasks/by-title/subtasks')
  addSubtasks(
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Body() dto: AddSubtasksByTitleRequestDto,
  ): Promise<AddSubtasksByTitleResponseDto> {
    return this.addSubtasksByTitle.addByTitle(tenantId, userId, dto);
  }
}
