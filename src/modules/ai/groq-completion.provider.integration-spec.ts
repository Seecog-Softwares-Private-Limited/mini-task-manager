import { ConfigService } from '@nestjs/config';
import {
  AiProviderTimeoutError,
  AiProviderUnavailableError,
} from './providers/ai-completion.provider';
import { GroqCompletionProvider } from './providers/groq-completion.provider';

const API_KEY = 'secret-value-should-not-leak';

function configService(overrides: Record<string, unknown> = {}): ConfigService {
  const ai = {
    provider: 'groq',
    apiKey: API_KEY,
    baseUrl: 'https://api.groq.com/openai/v1/',
    model: 'openai/gpt-oss-20b',
    timeoutMs: 25000,
    maxSuggestions: 8,
    ...overrides,
  };
  return { get: () => ai } as unknown as ConfigService;
}

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  } as Response;
}

describe('GroqCompletionProvider request', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  function mockFetch(response: Response | Error) {
    return jest.spyOn(global, 'fetch').mockImplementation(async () => {
      if (response instanceof Error) throw response;
      return response;
    });
  }

  async function expectUnavailable(run: () => Promise<unknown>) {
    try {
      await run();
      throw new Error('expected the provider call to fail');
    } catch (err) {
      expect(err).toBeInstanceOf(AiProviderUnavailableError);
      expect(String((err as Error).message)).not.toContain(API_KEY);
      expect(String((err as Error).stack ?? '')).not.toContain('Bearer');
    }
  }

  it('posts to the configured chat completions URL with the model, auth header, messages, and JSON mode', async () => {
    const fetchMock = mockFetch(
      jsonResponse(200, {
        choices: [{ message: { content: '{"suggestions":[{"title":"Write tests"}]}' } }],
      }),
    );
    const provider = new GroqCompletionProvider(configService());
    const content = await provider.completeJson({ system: 'rules', user: 'task text' });

    expect(content).toContain('Write tests');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.groq.com/openai/v1/chat/completions');
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Bearer ${API_KEY}`);
    expect(headers['Content-Type']).toBe('application/json');
    const body = JSON.parse(String(init.body));
    expect(body.model).toBe('openai/gpt-oss-20b');
    expect(body.messages).toEqual([
      { role: 'system', content: 'rules' },
      { role: 'user', content: 'task text' },
    ]);
    expect(body.response_format).toEqual({ type: 'json_object' });
  });

  it('extracts choices[0].message.content', async () => {
    mockFetch(jsonResponse(200, { choices: [{ message: { content: '{"suggestions":[]}' } }] }));
    const provider = new GroqCompletionProvider(configService());
    await expect(provider.completeJson({ system: 's', user: 'u' })).resolves.toBe('{"suggestions":[]}');
  });

  it('fails safely when choices are missing or empty', async () => {
    const provider = new GroqCompletionProvider(configService());
    mockFetch(jsonResponse(200, {}));
    await expectUnavailable(() => provider.completeJson({ system: 's', user: 'u' }));
    mockFetch(jsonResponse(200, { choices: [] }));
    await expectUnavailable(() => provider.completeJson({ system: 's', user: 'u' }));
  });

  it('fails safely when message or content is missing', async () => {
    const provider = new GroqCompletionProvider(configService());
    mockFetch(jsonResponse(200, { choices: [{}] }));
    await expectUnavailable(() => provider.completeJson({ system: 's', user: 'u' }));
    mockFetch(jsonResponse(200, { choices: [{ message: {} }] }));
    await expectUnavailable(() => provider.completeJson({ system: 's', user: 'u' }));
    mockFetch(jsonResponse(200, { choices: [{ message: { content: '   ' } }] }));
    await expectUnavailable(() => provider.completeJson({ system: 's', user: 'u' }));
  });

  it('fails safely when the success body is not JSON', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('bad json');
      },
      text: async () => 'not-json',
    } as unknown as Response);
    const provider = new GroqCompletionProvider(configService());
    await expectUnavailable(() => provider.completeJson({ system: 's', user: 'u' }));
  });

  it.each([401, 403, 429, 500, 502, 503])('handles provider status %s without leaking the API key', async (status) => {
    mockFetch(jsonResponse(status, { error: { message: `key ${API_KEY}` } }));
    const provider = new GroqCompletionProvider(configService());
    await expectUnavailable(() => provider.completeJson({ system: 's', user: 'u' }));
  });

  it('handles a network failure', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new TypeError(`network down ${API_KEY}`));
    const provider = new GroqCompletionProvider(configService());
    await expectUnavailable(() => provider.completeJson({ system: 's', user: 'u' }));
  });

  it('aborts a hanging request using AI_TIMEOUT_MS', async () => {
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
    await expect(provider.completeJson({ system: 's', user: 'u' })).rejects.toBeInstanceOf(AiProviderTimeoutError);
  });
});
