export interface AiCompletionRequest {
  system: string;
  user: string;
}

/** Provider-agnostic JSON completion. Implementations must not log prompt text. */
export interface AiCompletionProvider {
  completeJson(input: AiCompletionRequest): Promise<string>;
}

export const AI_COMPLETION_PROVIDER = 'AI_COMPLETION_PROVIDER';

export class AiProviderUnavailableError extends Error {
  constructor(message = 'AI provider is unavailable') {
    super(message);
    this.name = 'AiProviderUnavailableError';
  }
}

export class AiProviderTimeoutError extends Error {
  constructor(message = 'AI provider timed out') {
    super(message);
    this.name = 'AiProviderTimeoutError';
  }
}
