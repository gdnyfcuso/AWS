// 平台适配器基础类
// 为不同AI平台（OpenAI、Claude、自定义）提供统一的接入接口

import { createLogger } from '../../utils/logger';

const logger = createLogger('PlatformAdapter');

/**
 * 平台消息类型
 */
export interface PlatformMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: Date;
  metadata?: Record<string, unknown>;
}

/**
 * 平台能力
 */
export interface PlatformCapabilities {
  streaming: boolean;           // 支持流式响应
  function_calling: boolean;    // 支持函数调用
  vision: boolean;              // 支持图像理解
  context_window: number;       // 上下文窗口大小
  max_tokens: number;           // 最大输出tokens
}

/**
 * 平台配置
 */
export interface PlatformConfig {
  api_key: string;
  api_endpoint?: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  timeout?: number;
}

/**
 * 平台响应
 */
export interface PlatformResponse {
  content: string;
  finish_reason: 'stop' | 'length' | 'content_filter' | 'tool_calls' | 'error';
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  tool_calls?: Array<{
    id: string;
    name: string;
    arguments: string;
  }>;
}

/**
 * 平台统计信息
 */
export interface PlatformStats {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  total_tokens_used: number;
  average_response_time: number;
  last_request_time?: Date;
}

/**
 * 平台适配器抽象类
 * 所有平台适配器必须实现此接口
 */
export abstract class PlatformAdapter {
  protected config: PlatformConfig;
  protected stats: PlatformStats;
  protected abstract platformName: string;

  constructor(config: PlatformConfig) {
    this.config = config;
    this.stats = {
      total_requests: 0,
      successful_requests: 0,
      failed_requests: 0,
      total_tokens_used: 0,
      average_response_time: 0,
    };
  }

  /**
   * 获取平台名称
   */
  abstract getPlatformName(): string;

  /**
   * 获取平台能力
   */
  abstract getCapabilities(): PlatformCapabilities;

  /**
   * 发送聊天请求（非流式）
   */
  abstract chat(messages: PlatformMessage[], options?: Record<string, unknown>): Promise<PlatformResponse>;

  /**
   * 发送聊天请求（流式）
   * 默认实现不支持流式，子类可覆盖
   */
  async chatStream(
    messages: PlatformMessage[],
    onChunk: (chunk: string) => void,
    options?: Record<string, unknown>
  ): Promise<PlatformResponse> {
    throw new Error(`${this.platformName} does not support streaming`);
  }

  /**
   * 验证配置
   */
  abstract validateConfig(): boolean;

  /**
   * 测试连接
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.chat([
        {
          role: 'user',
          content: 'Hello, this is a connection test.',
        },
      ]);

      return !!response.content;
    } catch (error) {
      logger.error(`${this.platformName} connection test failed`, error);
      return false;
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): PlatformStats {
    return { ...this.stats };
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats = {
      total_requests: 0,
      successful_requests: 0,
      failed_requests: 0,
      total_tokens_used: 0,
      average_response_time: 0,
    };
  }

  /**
   * 更新统计信息
   */
  protected updateStats(success: boolean, tokensUsed: number, responseTime: number): void {
    this.stats.total_requests++;

    if (success) {
      this.stats.successful_requests++;
      this.stats.total_tokens_used += tokensUsed;
    } else {
      this.stats.failed_requests++;
    }

    // 更新平均响应时间
    const total = this.stats.total_requests;
    this.stats.average_response_time =
      (this.stats.average_response_time * (total - 1) + responseTime) / total;

    this.stats.last_request_time = new Date();
  }

  /**
   * 格式化消息为平台特定格式
   * 子类可覆盖此方法
   */
  protected formatMessages(messages: PlatformMessage[]): unknown {
    return messages;
  }

  /**
   * 处理错误
   */
  protected handleError(error: unknown): never {
    logger.error(`${this.platformName} request error`, error);
    throw error;
  }
}

/**
 * 平台适配器注册表
 */
export class PlatformAdapterRegistry {
  private static adapters: Map<string, PlatformAdapter> = new Map();

  /**
   * 注册平台适配器
   */
  static register(platformType: string, adapter: PlatformAdapter): void {
    this.adapters.set(platformType, adapter);
    logger.info(`Registered platform adapter: ${platformType}`);
  }

  /**
   * 获取平台适配器
   */
  static get(platformType: string): PlatformAdapter | undefined {
    return this.adapters.get(platformType);
  }

  /**
   * 检查平台是否已注册
   */
  static has(platformType: string): boolean {
    return this.adapters.has(platformType);
  }

  /**
   * 获取所有已注册的平台
   */
  static getAllPlatforms(): string[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * 注销平台适配器
   */
  static unregister(platformType: string): boolean {
    return this.adapters.delete(platformType);
  }

  /**
   * 获取所有适配器的统计信息
   */
  static getAllStats(): Record<string, PlatformStats> {
    const stats: Record<string, PlatformStats> = {};

    for (const [platform, adapter] of this.adapters.entries()) {
      stats[platform] = adapter.getStats();
    }

    return stats;
  }
}
