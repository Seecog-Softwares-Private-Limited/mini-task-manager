import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Configuration } from '../../../config/configuration';
import {
  AiCompletionProvider,
  AiCompletionRequest,
  AiProviderTimeoutError,
  AiProviderUnavailableError,
} from './ai-completion.provider';

type ChatMessage = { role: 'system' | 'user'; content: string };

const DEFAULT_TIMEOUT_MS = 25000;

@Injectable()
export class GroqCompletionProvider implements AiCompletionProvider {
  private readonly logger = new Logger(GroqCompletionProvider.name);

  constructor(private readonly config: ConfigService<Configuration>) {}

  async completeJson(input: AiCompletionRequest): Promise<string> {
    const ai = this.config.get('ai', { infer: true });
    if (!ai?.apiKey || !ai.model || !ai.baseUrl) {
      throw new AiProviderUnavailableError();
    }

    const timeoutMs = Number.isFinite(ai.timeoutMs) && ai.timeoutMs > 0 ? ai.timeoutMs : DEFAULT_TIMEOUT_MS;
    const messages: ChatMessage[] = [
      { role: 'system', content: input.system },
      { role: 'user', content: input.user },
    ];

    const withJsonMode = await this.post(ai, messages, timeoutMs, true);
    if (withJsonMode.ok) return withJsonMode.content;
    if (withJsonMode.retryWithoutJsonMode) {
      const plain = await this.post(ai, messages, timeoutMs, false);
      if (plain.ok) return plain.content;
      this.logger.warn(`AI completion failed with status ${plain.status}`);
      throw new AiProviderUnavailableError();
    }
    this.logger.warn(`AI completion failed with status ${withJsonMode.status}`);
    throw new AiProviderUnavailableError();
  }

  private async post(
    ai: NonNullable<Configuration['ai']>,
    messages: ChatMessage[],
    timeoutMs: number,
    jsonMode: boolean,
  ): Promise<
    | { ok: true; content: string }
    | { ok: false; status: number; retryWithoutJsonMode: boolean }
  > {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const body: Record<string, unknown> = {
      model: ai.model,
      temperature: 0.7,
      messages,
    };
    if (jsonMode) {
      body.response_format = { type: 'json_object' };
    }
    const baseUrl = ai.baseUrl.replace(/\/+$/, '');
    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ai.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!response.ok) {
        const retryWithoutJsonMode = jsonMode && response.status === 400 && (await this.mentionsJsonMode(response));
        return { ok: false, status: response.status, retryWithoutJsonMode };
      }
      return { ok: true, content: await this.readContent(response) };
    } catch (err) {
      if (err instanceof AiProviderUnavailableError || err instanceof AiProviderTimeoutError) {
        throw err;
      }
      if (controller.signal.aborted || (err instanceof Error && err.name === 'AbortError')) {
        throw new AiProviderTimeoutError();
      }
      this.logger.warn('AI completion request failed');
      throw new AiProviderUnavailableError();
    } finally {
      clearTimeout(timer);
    }
  }

  /** Look only for a json-mode rejection. The body is not logged or returned. */
  private async mentionsJsonMode(response: Response): Promise<boolean> {
    const text = await response.text().catch(() => '');
    return /response_format/i.test(text);
  }

  private async readContent(response: Response): Promise<string> {
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new AiProviderUnavailableError();
    }
    if (!payload || typeof payload !== 'object') {
      throw new AiProviderUnavailableError();
    }
    const choices = (payload as { choices?: unknown }).choices;
    if (!Array.isArray(choices) || choices.length === 0) {
      throw new AiProviderUnavailableError();
    }
    const message = (choices[0] as { message?: unknown } | null)?.message;
    if (!message || typeof message !== 'object') {
      throw new AiProviderUnavailableError();
    }
    const content = (message as { content?: unknown }).content;
    if (typeof content !== 'string' || !content.trim()) {
      throw new AiProviderUnavailableError();
    }
    return content;
  }
}
