// Agent API 路由

import { Router } from 'express';
import { z } from 'zod';
import { WorldEngine } from '../../core';
import { agentManager } from '../../core/AgentManager';
import { eventManager } from '../../core/EventManager';
import { locationSystem } from '../../core/LocationSystem';
import { authenticateApiKey, AuthenticatedRequest } from '../middleware/auth';
import { ErrorCode } from '../../types';
import { createLogger } from '../../utils/logger';

const logger = createLogger('AgentsAPI');
const router = Router();

// 获取世界引擎实例
const getEngine = () => WorldEngine.getInstance();

/**
 * POST /api/v1/agents/register
 * 注册新 Agent
 */
router.post('/register', async (req, res, next) => {
  try {
    // 验证请求体
    const schema = z.object({
      agent_id: z.string().min(1).max(100),
      agent_name: z.string().min(1).max(100),
      agent_type: z.enum(['openai_assistant', 'claude', 'custom']),
      webhook_url: z.string().url().optional(),
      capabilities: z.array(z.string()).optional(),
      preferences: z.record(z.unknown()).optional(),
    });

    const validated = await schema.parseAsync(req.body);

    const result = await agentManager.registerAgent(validated);

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
 * POST /api/v1/agents/:agent_id/action
 * Agent 执行行动
 */
router.post(
  '/:agent_id/action',
  authenticateApiKey,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { agent_id } = req.params;
      const agent = req.agent!;

      // 验证请求体
      const schema = z.object({
        action: z.enum([
          'move', 'go_to_work', 'go_home', 'work',
          'socialize', 'chat', 'make_friends',
          'relax', 'sleep', 'trade', 'buy_item'
        ]),
        parameters: z.record(z.unknown()).optional(),
        reasoning: z.string().optional(),
      });

      const validated = await schema.parseAsync(req.body);

      // 执行行动
      const result = await executeAction(agent_id, validated.action, validated.parameters || {});

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/agents/:agent_id
 * 获取 Agent 信息
 */
router.get(
  '/:agent_id',
  authenticateApiKey,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { agent_id } = req.params;

      const state = await agentManager.getAgentState(agent_id);

      if (!state) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found',
          error_code: ErrorCode.AGENT_NOT_FOUND,
        });
      }

      const agent = await agentManager.getAgent(agent_id);

      res.json({
        agent: {
          agent_id: agent!.agent_id,
          agent_name: agent!.agent_name,
          agent_type: agent!.agent_type,
          status: agent!.status,
          location: {
            id: state.location.location_id,
            name: state.location.name,
            coordinates: state.location.coordinates,
            type: state.location.type,
          },
          attributes: {
            money: Number(state.money),
            energy: state.energy,
            mood: state.mood,
            health: state.health,
          },
          relationships: [], // TODO: 从关系表获取
          recent_activities: [], // TODO: 从行动历史获取
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/agents/:agent_id/disconnect
 * Agent 断开连接
 */
router.post(
  '/:agent_id/disconnect',
  authenticateApiKey,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { agent_id } = req.params;
      const schema = z.object({
        reason: z.string().optional(),
      });

      const validated = await schema.parseAsync(req.body);

      const success = await agentManager.disconnectAgent(agent_id, validated.reason);

      if (success) {
        res.json({
          success: true,
          message: 'Agent 已安全断开连接，状态已保存。',
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Agent not found',
          error_code: ErrorCode.AGENT_NOT_FOUND,
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

// ==================== 辅助函数 ====================

/**
 * 执行行动
 */
async function executeAction(
  agentId: string,
  action: string,
  parameters: Record<string, unknown>
): Promise<{ success: boolean; result?: unknown; error?: string; error_code?: string }> {
  const state = await agentManager.getAgentState(agentId);

  if (!state) {
    return {
      success: false,
      error: 'Agent not found',
      error_code: ErrorCode.AGENT_NOT_FOUND,
    };
  }

  const stateChanges: Record<string, unknown> = {};
  const eventsTriggered: Array<{ type: string; [key: string]: unknown }> = [];

  try {
    switch (action) {
      case 'go_to_work': {
        const officeLocation = await locationSystem.getLocation('office_tech_park');

        if (!officeLocation) {
          return {
            success: false,
            error: 'Office location not found',
            error_code: ErrorCode.LOCATION_NOT_FOUND,
          };
        }

        // 更新位置
        await agentManager.updateAgentState(agentId, {
          location_id: officeLocation.id,
          energy: Math.max(0, state.energy - 10),
        });

        stateChanges.energy = -10;
        eventsTriggered.push({
          type: 'location_changed',
          from: state.location.location_id,
          to: officeLocation.location_id,
        });

        return {
          success: true,
          result: {
            action_performed: 'go_to_work',
            new_state: {
              location: {
                id: officeLocation.location_id,
                name: officeLocation.name,
                coordinates: officeLocation.coordinates,
                type: officeLocation.type,
              },
              status: {
                money: Number(state.money),
                energy: Math.max(0, state.energy - 10),
                mood: state.mood,
                health: state.health,
              },
            },
            events_triggered: eventsTriggered,
            message: '你到达了办公室。',
          },
        };
      }

      case 'work': {
        const earnings = 200;
        const energyCost = 20;

        if (state.energy < energyCost) {
          return {
            success: false,
            error: 'Not enough energy to work',
            error_code: ErrorCode.ACTION_NOT_ALLOWED,
          };
        }

        await agentManager.updateAgentState(agentId, {
          money: Number(state.money) + earnings,
          energy: state.energy - energyCost,
          total_earned: Number(state.total_earned) + earnings,
        });

        stateChanges.money = earnings;
        stateChanges.energy = -energyCost;

        return {
          success: true,
          result: {
            action_performed: 'work',
            new_state: {
              location: {
                id: state.location.location_id,
                name: state.location.name,
                coordinates: state.location.coordinates,
                type: state.location.type,
              },
              status: {
                money: Number(state.money) + earnings,
                energy: state.energy - energyCost,
                mood: 'focused',
                health: state.health,
              },
            },
            events_triggered: [
              {
                type: 'earned_money',
                amount: earnings,
              },
            ],
            message: `你工作了，获得了 ${earnings} 金币。`,
          },
        };
      }

      case 'relax': {
        const energyGain = 20;

        await agentManager.updateAgentState(agentId, {
          energy: Math.min(100, state.energy + energyGain),
          mood: 'relaxed',
        });

        stateChanges.energy = energyGain;

        return {
          success: true,
          result: {
            action_performed: 'relax',
            new_state: {
              location: {
                id: state.location.location_id,
                name: state.location.name,
                coordinates: state.location.coordinates,
                type: state.location.type,
              },
              status: {
                money: Number(state.money),
                energy: Math.min(100, state.energy + energyGain),
                mood: 'relaxed',
                health: state.health,
              },
            },
            events_triggered: [],
            message: '你休息了一会儿，感觉好多了。',
          },
        };
      }

      case 'sleep': {
        const energyGain = 50;

        await agentManager.updateAgentState(agentId, {
          energy: Math.min(100, state.energy + energyGain),
          mood: 'neutral',
        });

        stateChanges.energy = energyGain;

        return {
          success: true,
          result: {
            action_performed: 'sleep',
            new_state: {
              location: {
                id: state.location.location_id,
                name: state.location.name,
                coordinates: state.location.coordinates,
                type: state.location.type,
              },
              status: {
                money: Number(state.money),
                energy: Math.min(100, state.energy + energyGain),
                mood: 'neutral',
                health: state.health,
              },
            },
            events_triggered: [],
            message: '你睡了一觉，精神焕发。',
          },
        };
      }

      case 'socialize': {
        const targetAgentId = parameters.target as string;

        if (!targetAgentId) {
          return {
            success: false,
            error: 'Target agent ID required',
            error_code: ErrorCode.INVALID_ACTION,
          };
        }

        const nearbyAgents = await agentManager.getNearbyAgents(state.location_id, agentId);
        const nearby = nearbyAgents.find(a => a.agent_id === targetAgentId);

        if (!nearby) {
          return {
            success: false,
            error: 'Target agent not nearby',
            error_code: ErrorCode.ACTION_NOT_ALLOWED,
          };
        }

        await agentManager.updateAgentState(agentId, {
          interactions_count: state.interactions_count + 1,
        });

        // 创建社交事件
        await eventManager.createEvent({
          event_type: 'social_event',
          data: {
            type: 'chat_initiated',
            from_agent: { agent_id: agentId, name: req.agent?.agent_name || 'Unknown' },
            message: parameters.message || '你好！',
          },
          agent_id: targetAgentId,
        });

        return {
          success: true,
          result: {
            action_performed: 'socialize',
            new_state: {
              location: {
                id: state.location.location_id,
                name: state.location.name,
                coordinates: state.location.coordinates,
                type: state.location.type,
              },
              status: {
                money: Number(state.money),
                energy: state.energy,
                mood: 'happy',
                health: state.health,
              },
            },
            events_triggered: [
              {
                type: 'social_interaction',
                target: targetAgentId,
              },
            ],
            message: `你和 ${nearby.agent_name} 进行了愉快的交谈。`,
          },
        };
      }

      default:
        return {
          success: false,
          error: 'Unknown action',
          error_code: ErrorCode.INVALID_ACTION,
        };
    }
  } catch (error) {
    logger.error('Error executing action', error);
    return {
      success: false,
      error: 'Internal error',
      error_code: ErrorCode.INTERNAL_ERROR,
    };
  }
}

export default router;
