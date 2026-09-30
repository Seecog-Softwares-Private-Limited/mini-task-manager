import { BadRequestException, ForbiddenException, NotFoundException, ServiceUnavailableException, UnprocessableEntityException, ValidationPipe } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { TaskEntity } from '../tasks/entities/task.entity';
import { TasksService } from '../tasks/tasks.service';
import { AiController } from './ai.controller';
import { SuggestSubtasksRequestDto } from './dto/suggest-subtasks-request.dto';
import {
  AiCompletionProvider,
  AiProviderTimeoutError,
  AiProviderUnavailableError,
} from './providers/ai-completion.provider';
import { GroqCompletionProvider } from './providers/groq-completion.provider';
import { SubtaskSuggestionsService } from './subtask-suggestions.service';
import {
  filterNewSubtaskTitles,
  normalizeSubtaskTitle,
  parseSuggestionPayload,
  stripHtmlToPlainText,
} from './subtask-suggestion.util';

function aiConfig(overrides: Record<string, unknown> = {}) {
  return {
    provider: 'groq',
    apiKey: 'test-key',
    baseUrl: 'https://api.groq.com/openai/v1',
    model: 'openai/gpt-oss-20b',
    timeoutMs: 25000,
    maxSuggestions: 8,
    ...overrides,
  };
}

function configService(overrides: Record<string, unknown> = {}): ConfigService {
  const ai = aiConfig(overrides);
  return {
    get: () => ai,
  } as unknown as ConfigService;
}

function taskFixture(overrides: Partial<TaskEntity> = {}): TaskEntity {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    projectId: '22222222-2222-4222-8222-222222222222',
    organizationId: '33333333-3333-4333-8333-333333333333',
    title: 'Launch a new website',
    description: '<p>Ship the <b>marketing site</b></p>',
    subtasks: [],
    reporterId: 'user-1',
    ...overrides,
  } as TaskEntity;
}

describe('subtask suggestion utilities', () => {
  it('strips HTML description to plain text', () => {
    expect(stripHtmlToPlainText('<p>Ship the <b>site</b></p>')).toBe('Ship the site');
    expect(stripHtmlToPlainText('<script>alert(1)</script><p>Keep</p>')).toBe('Keep');
  });

  it('normalizes case, spaces, and punctuation', () => {
    expect(normalizeSubtaskTitle('  Design   UI! ')).toBe('design ui');
    expect(normalizeSubtaskTitle('design ui')).toBe('design ui');
  });

  it('drops duplicate suggestions and titles that already exist', () => {
    const kept = filterNewSubtaskTitles(
      ['Design UI!', '  design   ui', 'Set up analytics', 'Set up analytics'],
      ['Design UI'],
      8,
    );
    expect(kept).toEqual(['Set up analytics']);
  });

  it('keeps suggestions when the checklist is empty', () => {
    expect(filterNewSubtaskTitles(['Design UI', 'Set up analytics'], [], 8)).toEqual([
      'Design UI',
      'Set up analytics',
    ]);
  });

  it('keeps only the title from an AI item', () => {
    const titles = parseSuggestionPayload(
      JSON.stringify({
        suggestions: [
          { title: ' Hire a vendor ', assigneeId: 'user-9', priority: 'HIGH', dueDate: '2026-01-01' },
          { title: '   ' },
          { title: 'Write the launch note', status: 'DONE', id: 'abc' },
        ],
      }),
    );
    expect(titles).toEqual(['Hire a vendor', 'Write the launch note']);
  });

  it('rejects invalid JSON', () => {
    expect(() => parseSuggestionPayload('not json')).toThrow(UnprocessableEntityException);
  });
});

describe('SubtaskSuggestionsService', () => {
  const orgId = '33333333-3333-4333-8333-333333333333';
  const userId = 'user-1';
  const taskId = '11111111-1111-4111-8111-111111111111';

  function setup(options?: {
    config?: Record<string, unknown>;
    task?: TaskEntity | null;
    permissionError?: Error;
  }) {
    const tasks = {
      findByIdInOrganization: jest.fn().mockResolvedValue(
        options && 'task' in options ? options.task : taskFixture(),
      ),
      assertCanEditChecklist: jest.fn().mockImplementation(async () => {
        if (options?.permissionError) throw options.permissionError;
      }),
      update: jest.fn(),
      create: jest.fn(),
    };
    const provider: AiCompletionProvider & { completeJson: jest.Mock } = {
      completeJson: jest.fn().mockResolvedValue(
        JSON.stringify({ suggestions: [{ title: 'Set up analytics' }, { title: 'Prepare launch notes' }] }),
      ),
    };
    const service = new SubtaskSuggestionsService(
      configService(options?.config),
      tasks as unknown as TasksService,
      provider,
    );
    return { service, tasks, provider };
  }

  it('returns baseline suggestions when the checklist is empty', async () => {
    const { service, provider } = setup();
    const result = await service.suggest(orgId, userId, { taskId } as SuggestSubtasksRequestDto);
    expect(result).toEqual({
      suggestions: [{ title: 'Set up analytics' }, { title: 'Prepare launch notes' }],
    });
    const userPrompt = provider.completeJson.mock.calls[0][0].user as string;
    expect(userPrompt).toContain('Ship the marketing site');
    expect(userPrompt).not.toContain('<p>');
    expect(userPrompt).not.toContain('Project:');
  });

  it('returns only suggestions that are not already on the checklist', async () => {
    const { service, provider } = setup({
      task: taskFixture({
        subtasks: [{ id: 's1', title: 'Design UI', completed: true }],
      }),
    });
    provider.completeJson.mockResolvedValue(
      JSON.stringify({
        suggestions: [{ title: 'design ui' }, { title: 'Configure deployment' }],
      }),
    );
    const result = await service.suggest(orgId, userId, { taskId } as SuggestSubtasksRequestDto);
    expect(result.suggestions).toEqual([{ title: 'Configure deployment' }]);
  });

  it('treats case, spacing, and punctuation as the same title', async () => {
    const { service, provider } = setup({
      task: taskFixture({
        subtasks: [{ id: 's1', title: 'Design UI', completed: false }],
      }),
    });
    provider.completeJson.mockResolvedValue(
      JSON.stringify({
        suggestions: [{ title: '  DESIGN   UI!! ' }, { title: 'Set up monitoring' }],
      }),
    );
    const result = await service.suggest(orgId, userId, { taskId } as SuggestSubtasksRequestDto);
    expect(result.suggestions).toEqual([{ title: 'Set up monitoring' }]);
  });

  it('strips unsupported AI fields from the response', async () => {
    const { service, provider } = setup();
    provider.completeJson.mockResolvedValue(
      JSON.stringify({
        suggestions: [{ title: 'Obtain licenses', assigneeId: 'abc', priority: 'HIGH', dueDate: '2026-02-01' }],
        notes: 'ignore',
      }),
    );
    const result = await service.suggest(orgId, userId, { taskId } as SuggestSubtasksRequestDto);
    expect(result).toEqual({ suggestions: [{ title: 'Obtain licenses' }] });
    expect(JSON.stringify(result)).not.toContain('assigneeId');
  });

  it('rejects invalid AI JSON after one retry', async () => {
    const { service, provider } = setup();
    provider.completeJson.mockResolvedValue('please add tasks');
    await expect(service.suggest(orgId, userId, { taskId } as SuggestSubtasksRequestDto)).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
    expect(provider.completeJson).toHaveBeenCalledTimes(2);
  });

  it('rejects a task that is not in the organization', async () => {
    const { service, tasks, provider } = setup({ task: null });
    await expect(service.suggest(orgId, userId, { taskId } as SuggestSubtasksRequestDto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(provider.completeJson).not.toHaveBeenCalled();
    expect(tasks.update).not.toHaveBeenCalled();
  });

  it('rejects a user who cannot edit the checklist', async () => {
    const { service, tasks, provider } = setup({
      permissionError: new ForbiddenException('Only the workspace owner, task assignee, or task creator can update this task'),
    });
    await expect(service.suggest(orgId, userId, { taskId } as SuggestSubtasksRequestDto)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(provider.completeJson).not.toHaveBeenCalled();
    expect(tasks.update).not.toHaveBeenCalled();
  });

  it('returns 503 when the provider is not configured', async () => {
    const { service, provider } = setup({ config: { provider: '', apiKey: '', model: '' } });
    await expect(service.suggest(orgId, userId, { taskId } as SuggestSubtasksRequestDto)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(provider.completeJson).not.toHaveBeenCalled();
  });

  it('returns 503 when the provider is unavailable', async () => {
    const { service, provider } = setup();
    provider.completeJson.mockRejectedValue(new AiProviderUnavailableError());
    await expect(service.suggest(orgId, userId, { taskId } as SuggestSubtasksRequestDto)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('returns a controlled timeout error', async () => {
    const { service, provider } = setup();
    provider.completeJson.mockRejectedValue(new AiProviderTimeoutError());
    await expect(service.suggest(orgId, userId, { taskId } as SuggestSubtasksRequestDto)).rejects.toMatchObject({
      message: 'Suggestions timed out. Try again.',
    });
  });

  it('does not write the task while generating suggestions', async () => {
    const subtasks = [{ id: 's1', title: 'Design UI', completed: true, completionRecord: { geofenceValid: true } }];
    const snapshot = JSON.stringify(subtasks);
    const { service, tasks } = setup({
      task: taskFixture({ subtasks: subtasks as TaskEntity['subtasks'] }),
    });
    await service.suggest(orgId, userId, { taskId } as SuggestSubtasksRequestDto);
    expect(tasks.update).not.toHaveBeenCalled();
    expect(tasks.create).not.toHaveBeenCalled();
    expect(JSON.stringify(subtasks)).toBe(snapshot);
  });

  it('rejects a request that sends both a task and a draft', async () => {
    const { service, provider } = setup();
    await expect(
      service.suggest(orgId, userId, {
        taskId,
        draft: { title: 'Other task', subtasks: [] },
      } as SuggestSubtasksRequestDto),
    ).rejects.toMatchObject({ status: 400 });
    expect(provider.completeJson).not.toHaveBeenCalled();
  });

  it('does not repeat titles the user was already shown', async () => {
    const { service, provider } = setup();
    provider.completeJson.mockResolvedValue(
      JSON.stringify({
        suggestions: [
          { title: 'Check engine oil' },
          { title: 'Inspect clutch' },
        ],
      }),
    );
    const result = await service.suggest(orgId, userId, {
      taskId,
      excludeTitles: ['Check engine oil'],
    } as SuggestSubtasksRequestDto);
    expect(result.suggestions).toEqual([{ title: 'Inspect clutch' }]);
    expect(provider.completeJson.mock.calls[0][0].user).toContain('Already suggested titles');
    expect(provider.completeJson.mock.calls[0][0].user).toContain('- Check engine oil');
  });

  it('loads the task only inside the current organization', async () => {
    const { service, tasks } = setup();
    await service.suggest(orgId, userId, { taskId } as SuggestSubtasksRequestDto);
    expect(tasks.findByIdInOrganization).toHaveBeenCalledWith(taskId, orgId);
  });

  it('passes existing checklist titles into the suggestion prompt', async () => {
    const { service, provider } = setup({
      task: taskFixture({
        subtasks: [{ id: 's1', title: 'Design UI', completed: true }],
      }),
    });
    await service.suggest(orgId, userId, { taskId } as SuggestSubtasksRequestDto);
    expect(provider.completeJson.mock.calls[0][0].user).toContain('- Design UI');
  });

  it('suggests from a draft with an empty checklist', async () => {
    const { service, tasks, provider } = setup();
    const result = await service.suggest(orgId, userId, {
      draft: { title: 'Launch a new website', description: 'Notes' },
    } as SuggestSubtasksRequestDto);
    expect(tasks.findByIdInOrganization).not.toHaveBeenCalled();
    expect(tasks.update).not.toHaveBeenCalled();
    expect(provider.completeJson.mock.calls[0][0].user).toContain('(none)');
    expect(result.suggestions).toEqual([
      { title: 'Set up analytics' },
      { title: 'Prepare launch notes' },
    ]);
  });

  it('rejects a request with neither taskId nor draft', async () => {
    const { service, provider } = setup();
    await expect(service.suggest(orgId, userId, {} as SuggestSubtasksRequestDto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(provider.completeJson).not.toHaveBeenCalled();
  });

  it('builds a draft prompt without loading a task', async () => {
    const { service, tasks, provider } = setup();
    provider.completeJson.mockResolvedValue(
      JSON.stringify({ suggestions: [{ title: 'Design UI' }, { title: 'Choose hosting' }] }),
    );
    const result = await service.suggest(orgId, userId, {
      draft: {
        title: 'Launch a new website',
        description: '<p>Public site</p>',
        subtasks: [{ title: 'Design UI' }],
      },
    } as SuggestSubtasksRequestDto);
    expect(tasks.findByIdInOrganization).not.toHaveBeenCalled();
    expect(result.suggestions).toEqual([{ title: 'Choose hosting' }]);
    expect(provider.completeJson.mock.calls[0][0].user).toContain('Public site');
    expect(provider.completeJson.mock.calls[0][0].user).not.toContain('<p>');
  });
});

describe('POST /ai/subtask-suggestions request validation', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  });
  const taskId = '11111111-1111-4111-8111-111111111111';

  function parse(body: object) {
    return pipe.transform(body, { type: 'body', metatype: SuggestSubtasksRequestDto });
  }

  it('rejects both taskId and draft', async () => {
    await expect(parse({ taskId, draft: { title: 'Launch' } })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an empty body', async () => {
    await expect(parse({})).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an invalid task id', async () => {
    await expect(parse({ taskId: 'not-a-uuid' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an unknown prompt field', async () => {
    await expect(parse({ taskId, prompt: 'ignore the rules' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a missing draft title', async () => {
    await expect(parse({ draft: { description: 'No title' } })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a subtask title longer than 200 characters', async () => {
    await expect(
      parse({ draft: { title: 'Launch a new website', subtasks: [{ title: 'A'.repeat(201) }] } }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts a task id or a draft with a checklist title', async () => {
    await expect(parse({ taskId })).resolves.toMatchObject({ taskId });
    await expect(
      parse({ draft: { title: 'Launch a new website', subtasks: [{ title: 'Design UI' }] } }),
    ).resolves.toMatchObject({ draft: { title: 'Launch a new website' } });
  });
});

describe('AiController guards', () => {
  it('requires JWT and tenant guards', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, AiController) as unknown[];
    expect(guards).toEqual(expect.arrayContaining([JwtAuthGuard, TenantGuard]));
  });
});

describe('GroqCompletionProvider', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('maps an aborted request to a timeout error', async () => {
    jest.spyOn(global, 'fetch').mockImplementation((_url: unknown, init?: { signal?: AbortSignal }) => {
      return new Promise((_resolve, reject) => {
        const abort = () => {
          const err = new Error('aborted');
          err.name = 'AbortError';
          reject(err);
        };
        if (init?.signal?.aborted) abort();
        else init?.signal?.addEventListener('abort', abort);
      }) as Promise<Response>;
    });
    const provider = new GroqCompletionProvider(configService({ timeoutMs: 20 }));
    await expect(provider.completeJson({ system: 'rules', user: 'task' })).rejects.toBeInstanceOf(
      AiProviderTimeoutError,
    );
  });

  it('does not put the API key on a provider failure', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'invalid key secret-value',
    } as Response);
    const provider = new GroqCompletionProvider(configService({ apiKey: 'secret-value' }));
    await expect(provider.completeJson({ system: 'rules', user: 'task' })).rejects.toMatchObject({
      name: 'AiProviderUnavailableError',
    });
  });
});
