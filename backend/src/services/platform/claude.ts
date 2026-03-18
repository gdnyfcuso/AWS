// Claude (Anthropic) 平台适配器

import {
  PlatformAdapter,
  PlatformConfig,
  PlatformMessage,
  PlatformResponse,
  PlatformCapabilities,
} from './base';
import { createLogger } from '../../utils/logger';

const logger = createLogger('ClaudeAdapter');

/**
 * Claude 平台适配器
 */
export class ClaudeAdapter extends PlatformAdapter {
  protected platformName = 'Claude';
  private readonly defaultEndpoint = 'https://api.anthropic.com/v1/messages';
  private readonly defaultModel = 'claude-3-5-sonnet-20241022';

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
      context_window: 200000,
      max_tokens: 8192,
    };
  }

  async chat(
    messages: PlatformMessage[],
    options: Record<string, unknown> = {}
  ): Promise<PlatformResponse> {
    const startTime = Date.now();

    try {
      // Claude API 需要将系统消息单独处理
      const systemMessage = messages.find(m => m.role === 'system');
      const chatMessages = messages.filter(m => m.role !== 'system');

      const response = await fetch(
        this.config.api_endpoint || this.defaultEndpoint,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.config.api_key,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: this.config.model || this.defaultModel,
            messages: chatMessages.map(m => ({
              role: m.role === 'assistant' ? 'assistant' : 'user',
              content: m.content,
            })),
            system: systemMessage?.content,
            temperature: this.config.temperature ?? 0.7,
            max_tokens: this.config.max_tokens ?? 1000,
            ...options,
          }),
          signal: AbortSignal.timeout(this.config.timeout ?? 30000),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Claude API error');
      }

      const data = await response.json();

      const result: PlatformResponse = {
        content: data.content[0]?.text || '',
        finish_reason: data.stop_reason === 'end_turn' ? 'stop' : data.stop_reason,
        usage: {
          prompt_tokens: data.usage?.input_tokens || 0,
          completion_tokens: data.usage?.output_tokens || 0,
          total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
        },
      };

      // 处理工具使用
      if (data.content.some((c: any) => c.type === 'tool_use')) {
        result.tool_calls = data.content
          .filter((c: any) => c.type === 'tool_use')
          .map((tc: any) => ({
            id: tc.id,
            name: tc.name,
            arguments: JSON.stringify(tc.input),
          }));

        if (result.tool_calls.length > 0) {
          result.finish_reason = 'tool_calls';
        }
      }

      const responseTime = Date.now() - startTime;
      this.updateStats(
        true,
        result.usage?.total_tokens || 0,
        responseTime
      );

      logger.debug(`Claude request completed in ${responseTime}ms`);

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
      const systemMessage = messages.find(m => m.role === 'system');
      const chatMessages = messages.filter(m => m.role !== 'system');

      const response = await fetch(
        this.config.api_endpoint || this.defaultEndpoint,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.config.api_key,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: this.config.model || this.defaultModel,
            messages: chatMessages.map(m => ({
              role: m.role === 'assistant' ? 'assistant' : 'user',
              content: m.content,
            })),
            system: systemMessage?.content,
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
        throw new Error(error.error?.message || 'Claude API error');
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

              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                fullContent += parsed.delta.text;
                onChunk(parsed.delta.text);
              }

              if (parsed.type === 'message_stop' && parsed.message?.usage) {
                totalTokens =
                  (parsed.message.usage.input_tokens || 0) +
                  (parsed.message.usage.output_tokens || 0);
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
      throw new Error('Claude API key is required');
    }
    return true;
  }
}

/**
 * 创建 Claude 适配器实例
 */
export function createClaudeAdapter(config: PlatformConfig): ClaudeAdapter {
  return new ClaudeAdapter(config);
}
