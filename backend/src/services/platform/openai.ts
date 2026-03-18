// OpenAI 平台适配器

import {
  PlatformAdapter,
  PlatformConfig,
  PlatformMessage,
  PlatformResponse,
  PlatformCapabilities,
} from './base';
import { createLogger } from '../../utils/logger';

const logger = createLogger('OpenAIAdapter');

/**
 * OpenAI 平台适配器
 */
export class OpenAIAdapter extends PlatformAdapter {
  protected platformName = 'OpenAI';
  private readonly defaultEndpoint = 'https://api.openai.com/v1/chat/completions';
  private readonly defaultModel = 'gpt-4o';

  constructor(config: PlatformConfig) {
    super(config);
    this.validateConfig();
  }

  getPlatformName(): string {
    return this.platformName;
  }

  getCapabilities(): PlatformCapabilities {
    return {
      streaming: true,
      function_calling: true,
      vision: true,
      context_window: 128000,
      max_tokens: 4096,
    };
  }

  async chat(
    messages: PlatformMessage[],
    options: Record<string, unknown> = {}
  ): Promise<PlatformResponse> {
    const startTime = Date.now();

    try {
      const response = await fetch(
        this.config.api_endpoint || this.defaultEndpoint,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.api_key}`,
          },
          body: JSON.stringify({
            model: this.config.model || this.defaultModel,
            messages: messages.map(m => ({
              role: m.role,
              content: m.content,
            })),
            temperature: this.config.temperature ?? 0.7,
            max_tokens: this.config.max_tokens ?? 1000,
            ...options,
          }),
          signal: AbortSignal.timeout(this.config.timeout ?? 30000),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'OpenAI API error');
      }

      const data = await response.json();
      const choice = data.choices[0];

      const result: PlatformResponse = {
        content: choice.message.content || '',
        finish_reason: choice.finish_reason,
        usage: {
          prompt_tokens: data.usage?.prompt_tokens || 0,
          completion_tokens: data.usage?.completion_tokens || 0,
          total_tokens: data.usage?.total_tokens || 0,
        },
      };

      // 处理函数调用
      if (choice.message.tool_calls) {
        result.tool_calls = choice.message.tool_calls.map((tc: any) => ({
          id: tc.id,
          name: tc.function.name,
          arguments: tc.function.arguments,
        }));
      }

      const responseTime = Date.now() - startTime;
      this.updateStats(
        true,
        result.usage?.total_tokens || 0,
        responseTime
      );

      logger.debug(`OpenAI request completed in ${responseTime}ms`);

      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.updateStats(false, 0, responseTime);
      this.handleError(error);
    }
  }

  async chatStream(
    messages: PlatformMessage[],
    onChunk: (chunk: string) => void,
    options: Record<string, unknown> = {}
  ): Promise<PlatformResponse> {
    const startTime = Date.now();

    try {
      const response = await fetch(
        this.config.api_endpoint || this.defaultEndpoint,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.api_key}`,
          },
          body: JSON.stringify({
            model: this.config.model || this.defaultModel,
            messages: messages.map(m => ({
              role: m.role,
              content: m.content,
            })),
            temperature: this.config.temperature ?? 0.7,
            max_tokens: this.config.max_tokens ?? 1000,
            stream: true,
            ...options,
          }),
          signal: AbortSignal.timeout(this.config.timeout ?? 60000),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'OpenAI API error');
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let totalTokens = 0;

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            if (data === '[DONE]') {
              break;
            }

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices[0]?.delta;

              if (delta?.content) {
                fullContent += delta.content;
                onChunk(delta.content);
              }

              if (parsed.usage) {
                totalTokens = parsed.usage.total_tokens || 0;
              }
            } catch {
              // 忽略解析错误
            }
          }
        }
      }

      const responseTime = Date.now() - startTime;
      this.updateStats(true, totalTokens, responseTime);

      return {
        content: fullContent,
        finish_reason: 'stop',
        usage: {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: totalTokens,
        },
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.updateStats(false, 0, responseTime);
      this.handleError(error);
    }
  }

  validateConfig(): boolean {
    if (!this.config.api_key) {
      throw new Error('OpenAI API key is required');
    }
    return true;
  }
}

/**
 * 创建 OpenAI 适配器实例
 */
export function createOpenAIAdapter(config: PlatformConfig): OpenAIAdapter {
  return new OpenAIAdapter(config);
}
