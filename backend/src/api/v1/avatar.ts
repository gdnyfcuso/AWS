// 头像 API 路由

import { Router } from 'express';
import { z } from 'zod';
import { authenticateApiKey, AuthenticatedRequest } from '../middleware/auth';
import { avatarService } from '../../services/avatar';
import { ErrorCode } from '../../types';

const router = Router();

/**
 * POST /api/v1/avatar/generate
 * 生成头像
 */
router.post('/generate', authenticateApiKey, async (req: AuthenticatedRequest, res, next) => {
  try {
    const schema = z.object({
      agent_id: z.string().optional(),
      config: z.object({
        style: z.enum(['realistic', 'cartoon', 'pixel', 'anime', '3d_render']).default('anime'),
        gender: z.enum(['male', 'female', 'non_binary']).optional(),
        age_range: z.enum(['young', 'middle', 'elderly']).optional(),
        skin_tone: z.string().optional(),
        hair_color: z.string().optional(),
        hair_style: z.string().optional(),
        eye_color: z.string().optional(),
        accessories: z.array(z.string()).optional(),
        outfit: z.string().optional(),
        background: z.string().optional(),
        mood: z.enum([
          'joy', 'trust', 'fear', 'surprise', 'sadness',
          'disgust', 'anger', 'anticipation', 'love',
          'optimism', 'pessimism', 'boredom'
        ]).optional(),
      }),
      force_regenerate: z.boolean().default(false),
    });

    const validated = await schema.parseAsync(req.body);

    const result = await avatarService.generateAvatar({
      agent_id: validated.agent_id,
      config: validated.config,
      force_regenerate: validated.force_regenerate,
    });

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/avatar/:agent_id
 * 获取Agent的头像
 */
router.get('/:agent_id', async (req, res, next) => {
  try {
    const { agent_id } = req.params;

    const avatar = await avatarService.getAvatarByAgentId(agent_id);

    if (!avatar) {
      return res.status(404).json({
        success: false,
        error: 'Avatar not found',
        error_code: ErrorCode.AGENT_NOT_FOUND,
      });
    }

    res.json({
      success: true,
      avatar,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/avatar/:agent_id/suggest
 * 获取头像配置建议
 */
router.get('/:agent_id/suggest', authenticateApiKey, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { agent_id } = req.params;

    const config = await avatarService.suggestAvatarConfig(agent_id);

    res.json({
      success: true,
      config,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/avatar/:agent_id
 * 更新头像配置
 */
router.put('/:agent_id', authenticateApiKey, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { agent_id } = req.params;

    const schema = z.object({
      style: z.enum(['realistic', 'cartoon', 'pixel', 'anime', '3d_render']).optional(),
      gender: z.enum(['male', 'female', 'non_binary']).optional(),
      age_range: z.enum(['young', 'middle', 'elderly']).optional(),
      skin_tone: z.string().optional(),
      hair_color: z.string().optional(),
      hair_style: z.string().optional(),
      eye_color: z.string().optional(),
      accessories: z.array(z.string()).optional(),
      outfit: z.string().optional(),
      background: z.string().optional(),
      mood: z.enum([
        'joy', 'trust', 'fear', 'surprise', 'sadness',
        'disgust', 'anger', 'anticipation', 'love',
        'optimism', 'pessimism', 'boredom'
      ]).optional(),
    });

    const configUpdate = await schema.parseAsync(req.body);

    const result = await avatarService.updateAvatar(agent_id, configUpdate);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/avatar/:agent_id
 * 删除头像
 */
router.delete('/:agent_id', authenticateApiKey, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { agent_id } = req.params;

    const success = await avatarService.deleteAvatar(agent_id);

    if (success) {
      res.json({
        success: true,
        message: 'Avatar deleted successfully',
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Avatar not found',
        error_code: ErrorCode.AGENT_NOT_FOUND,
      });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/avatar/batch
 * 批量生成头像
 */
router.post('/batch', authenticateApiKey, async (req: AuthenticatedRequest, res, next) => {
  try {
    const schema = z.object({
      agent_ids: z.array(z.string()).min(1).max(50),
      style: z.enum(['realistic', 'cartoon', 'pixel', 'anime', '3d_render']).default('anime'),
    });

    const validated = await schema.parseAsync(req.body);

    const results = await avatarService.generateBatchAvatars(
      validated.agent_ids,
      validated.style
    );

    // 转换 Map 为对象
    const resultsObj: Record<string, any> = {};
    for (const [agentId, result] of results.entries()) {
      resultsObj[agentId] = result;
    }

    res.json({
      success: true,
      results: resultsObj,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/avatar/validate
 * 验证头像URL
 */
router.post('/validate', authenticateApiKey, async (req: AuthenticatedRequest, res, next) => {
  try {
    const schema = z.object({
      url: z.string().url(),
    });

    const validated = await schema.parseAsync(req.body);

    const isValid = await avatarService.validateAvatarUrl(validated.url);

    res.json({
      success: true,
      valid: isValid,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/avatar/refresh
 * 刷新失效的头像
 */
router.post('/refresh', authenticateApiKey, async (req: AuthenticatedRequest, res, next) => {
  try {
    const count = await avatarService.refreshInvalidAvatars();

    res.json({
      success: true,
      refreshed: count,
      message: `Refreshed ${count} invalid avatar(s)`,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
