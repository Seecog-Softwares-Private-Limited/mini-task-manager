import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Configuration } from '../../config/configuration';
import { TasksService } from '../tasks/tasks.service';
import { SuggestSubtasksRequestDto } from './dto/suggest-subtasks-request.dto';
import { toSuggestionResponse, SubtaskSuggestionsResponseDto } from './dto/subtask-suggestions-response.dto';
import { buildSuggestSubtasksPrompt } from './prompts/suggest-subtasks.prompt';
import {
  AI_COMPLETION_PROVIDER,
  AiCompletionProvider,
  AiProviderTimeoutError,
  AiProviderUnavailableError,
} from './providers/ai-completion.provider';
import {
  filterNewSubtaskTitles,
  parseSuggestionPayload,
  prepareSubtaskSuggestionInput,
  resolveMaxSubtaskSuggestions,
} from './subtask-suggestion.util';

const USER_HOURLY_LIMIT = 30;
const HOUR_MS = 60 * 60 * 1000;

interface SuggestionContext {
  title: string;
  description: string;
  existingTitles: string[];
}

@Injectable()
export class SubtaskSuggestionsService {
  private readonly logger = new Logger(SubtaskSuggestionsService.name);
  private readonly recentCalls = new Map<string, number[]>();

  constructor(
    private readonly config: ConfigService<Configuration>,
    private readonly tasksService: TasksService,
    @Inject(AI_COMPLETION_PROVIDER)
    private readonly provider: AiCompletionProvider,
  ) {}

  async suggest(
    organizationId: string,
    userId: string,
    dto: SuggestSubtasksRequestDto,
  ): Promise<SubtaskSuggestionsResponseDto> {
    this.assertConfigured();
    this.consumeRateLimit(`${organizationId}:${userId}`);

    const hasTask = typeof dto.taskId === 'string' && dto.taskId.length > 0;
    const hasDraft = dto.draft != null;
    if (hasTask === hasDraft) {
      throw new BadRequestException('Provide exactly one of taskId or draft');
    }

    const context = hasTask
      ? await this.contextFromTask(organizationId, userId, dto.taskId!)
      : this.contextFromDraft(dto.draft!);
    const alreadySuggestedTitles = (dto.excludeTitles ?? [])
      .map((title) => title.trim())
      .filter((title) => title.length > 0)
      .slice(0, 40);

    const maxSuggestions = this.maxSuggestions();
    const prompt = buildSuggestSubtasksPrompt({
      title: context.title,
      description: context.description,
      existingTitles: context.existingTitles,
      alreadySuggestedTitles,
      maxSuggestions,
    });
    const parsed = await this.completeWithRetry(organizationId, prompt.system, prompt.user);
    const titles = filterNewSubtaskTitles(
      parsed,
      [...context.existingTitles, ...alreadySuggestedTitles],
      maxSuggestions,
    );
    return toSuggestionResponse(titles);
  }

  private async contextFromTask(
    organizationId: string,
    userId: string,
    taskId: string,
  ): Promise<SuggestionContext> {
    const task = await this.tasksService.findByIdInOrganization(taskId, organizationId);
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    await this.tasksService.assertCanEditChecklist(task, organizationId, userId);
    const prepared = prepareSubtaskSuggestionInput(task);
    return {
      title: prepared.title || task.title,
      description: prepared.description,
      existingTitles: prepared.existingTitles,
    };
  }

  private contextFromDraft(draft: NonNullable<SuggestSubtasksRequestDto['draft']>): SuggestionContext {
    const title = draft.title?.trim() ?? '';
    if (!title) {
      throw new BadRequestException('A task title is required');
    }
    const prepared = prepareSubtaskSuggestionInput({
      title,
      description: draft.description,
      subtasks: draft.subtasks,
    });
    return prepared;
  }

  private async completeWithRetry(
    organizationId: string,
    system: string,
    user: string,
  ): Promise<string[]> {
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const raw = await this.callProvider(organizationId, system, user);
      try {
        return parseSuggestionPayload(raw);
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError;
  }

  private async callProvider(organizationId: string, system: string, user: string): Promise<string> {
    try {
      return await this.provider.completeJson({ system, user });
    } catch (err) {
      if (err instanceof AiProviderTimeoutError) {
        this.logger.warn(`Subtask suggestions timed out for organization ${organizationId}`);
        throw new ServiceUnavailableException('Suggestions timed out. Try again.');
      }
      this.logger.warn(`Subtask suggestions unavailable for organization ${organizationId}`);
      if (err instanceof AiProviderUnavailableError) {
        throw new ServiceUnavailableException('Subtask suggestions are unavailable right now.');
      }
      throw new ServiceUnavailableException('Subtask suggestions are unavailable right now.');
    }
  }

  private assertConfigured(): void {
    const ai = this.config.get('ai', { infer: true });
    if (!ai?.provider || !ai.apiKey || !ai.model) {
      throw new ServiceUnavailableException('Subtask suggestions are unavailable right now.');
    }
  }

  private maxSuggestions(): number {
    return resolveMaxSubtaskSuggestions(this.config.get('ai', { infer: true })?.maxSuggestions);
  }

  private consumeRateLimit(key: string): void {
    const now = Date.now();
    const recent = (this.recentCalls.get(key) ?? []).filter((at) => now - at < HOUR_MS);
    if (recent.length >= USER_HOURLY_LIMIT) {
      this.recentCalls.set(key, recent);
      throw new HttpException(
        'Subtask suggestions are temporarily limited. Try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    recent.push(now);
    this.recentCalls.set(key, recent);
  }
}
