// 平台适配器 API 路由

import { Router } from 'express';
import { z } from 'zod';
import { authenticateApiKey, AuthenticatedRequest } from '../middleware/auth';
import {
  initializePlatformAdapters,
  getPlatformAdapter,
  testAllPlatforms,
  PlatformAdapterRegistry,
} from '../../services/platform';
import { ErrorCode } from '../../types';

const router = Router();

// 初始化平台适配器（如果尚未初始化）
initializePlatformAdapters();

/**
 * GET /api/v1/platform/stats
 * 获取所有平台统计信息
 * 注意：必须在动态路由之前定义
 */
router.get('/stats', authenticateApiKey, async (_req: AuthenticatedRequest, res, next) => {
  try {
    const stats = PlatformAdapterRegistry.getAllStats();

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/platform/health
 * 检查所有平台健康状态
 */
router.get('/health', async (_req, res, next) => {
  try {
    const platforms = PlatformAdapterRegistry.getAllPlatforms();
    const health: Record<string, 'available' | 'unavailable'> = {};

    for (const platform of platforms) {
      health[platform] = 'available';
    }

    res.json({
      success: true,
      platforms: health,
      count: platforms.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/platform/test
 * 测试所有平台连接
 */
router.post('/test', authenticateApiKey, async (req: AuthenticatedRequest, res, next) => {
  try {
    const results = await testAllPlatforms();

    res.json({
      success: true,
      results,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/platform/:platform_type/info
 * 获取平台信息
 */
router.get('/:platform_type/info', async (req, res, next) => {
  try {
    const { platform_type } = req.params;

    const adapter = getPlatformAdapter(platform_type);

    if (!adapter) {
      return res.status(404).json({
        success: false,
        error: 'Platform not found',
        error_code: ErrorCode.LOCATION_NOT_FOUND,
      });
    }

    res.json({
      success: true,
      platform: {
        name: adapter.getPlatformName(),
        capabilities: adapter.getCapabilities(),
        stats: adapter.getStats(),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/platform/:platform_type/chat
 * 发送聊天请求
 */
router.post('/:platform_type/chat', authenticateApiKey, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { platform_type } = req.params;

    const schema = z.object({
      messages: z.array(z.object({
        role: z.enum(['system', 'user', 'assistant']),
        content: z.string(),
      })),
      stream: z.boolean().default(false),
      options: z.record(z.unknown()).optional(),
    });

    const validated = await schema.parseAsync(req.body);

    const adapter = getPlatformAdapter(platform_type);

    if (!adapter) {
      return res.status(404).json({
        success: false,
        error: 'Platform not found',
        error_code: ErrorCode.LOCATION_NOT_FOUND,
      });
    }

    // 检查平台是否支持流式
    if (validated.stream) {
      const capabilities = adapter.getCapabilities();
      if (!capabilities.streaming) {
        return res.status(400).json({
          success: false,
          error: 'Platform does not support streaming',
          error_code: ErrorCode.INVALID_ACTION,
        });
      }

      // 流式响应
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const result = await adapter.chatStream(
        validated.messages as any,
        (chunk) => {
          res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
        },
        validated.options
      );

      res.write(`data: ${JSON.stringify({ done: true, result })}\n\n`);
      res.end();
    } else {
      // 非流式响应
      const result = await adapter.chat(
        validated.messages as any,
        validated.options
      );

      res.json({
        success: true,
        result,
      });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/platform/:platform_type/reset-stats
 * 重置平台统计信息
 */
router.post('/:platform_type/reset-stats', authenticateApiKey, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { platform_type } = req.params;

    const adapter = getPlatformAdapter(platform_type);

    if (!adapter) {
      return res.status(404).json({
        success: false,
        error: 'Platform not found',
        error_code: ErrorCode.LOCATION_NOT_FOUND,
      });
    }

    adapter.resetStats();

    res.json({
      success: true,
      message: 'Stats reset successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
