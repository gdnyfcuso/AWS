// 平台适配器入口
// 导出所有平台适配器和相关类型

export {
  PlatformAdapter,
  PlatformAdapterRegistry,
  type PlatformMessage,
  type PlatformConfig,
  type PlatformResponse,
  type PlatformCapabilities,
  type PlatformStats,
} from './base';

export {
  OpenAIAdapter,
  createOpenAIAdapter,
} from './openai';

export {
  ClaudeAdapter,
  createClaudeAdapter,
} from './claude';

import { OpenAIAdapter, createOpenAIAdapter } from './openai';
import { ClaudeAdapter, createClaudeAdapter } from './claude';
import { PlatformAdapterRegistry } from './base';

/**
 * 初始化平台适配器注册表
 * 根据环境变量自动配置可用的平台
 */
export function initializePlatformAdapters(): void {
  // OpenAI 配置
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (openaiApiKey) {
    const openaiAdapter = createOpenAIAdapter({
      api_key: openaiApiKey,
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      api_endpoint: process.env.OPENAI_API_ENDPOINT,
    });
    PlatformAdapterRegistry.register('openai', openaiAdapter);
    PlatformAdapterRegistry.register('openai_assistant', openaiAdapter);
  }

  // Claude 配置
  const claudeApiKey = process.env.CLAUDE_API_KEY;
  if (claudeApiKey) {
    const claudeAdapter = createClaudeAdapter({
      api_key: claudeApiKey,
      model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
      api_endpoint: process.env.CLAUDE_API_ENDPOINT,
    });
    PlatformAdapterRegistry.register('claude', claudeAdapter);
  }
}

/**
 * 获取指定平台的适配器
 */
export function getPlatformAdapter(platformType: string) {
  return PlatformAdapterRegistry.get(platformType);
}

/**
 * 测试所有已注册平台的连接
 */
export async function testAllPlatforms(): Promise<Record<string, boolean>> {
  const platforms = PlatformAdapterRegistry.getAllPlatforms();
  const results: Record<string, boolean> = {};

  for (const platform of platforms) {
    const adapter = PlatformAdapterRegistry.get(platform);
    if (adapter) {
      try {
        results[platform] = await adapter.testConnection();
      } catch {
        results[platform] = false;
      }
    }
  }

  return results;
}
