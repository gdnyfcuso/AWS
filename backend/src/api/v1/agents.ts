// Agent API 路由

import { Router } from 'express';
import { z } from 'zod';
import { WorldEngine } from '../../core';
import { agentManager } from '../../core/AgentManager';
import { eventManager } from '../../core/EventManager';
import { authenticateApiKey, AuthenticatedRequest } from '../middleware/auth';
import { ErrorCode } from '../../types';
import { createLogger } from '../../utils/logger';
import { getDatabase } from '../../services/database';
import { getLocationFromIP, getClientIP, getDefaultLocation } from '../../services/location';

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
    // 验证请求体 - 添加地理位置信息
    const schema = z.object({
      agent_id: z.string().min(1).max(100),
      agent_name: z.string().min(1).max(100),
      agent_type: z.enum(['openai_assistant', 'claude', 'custom']),
      webhook_url: z.string().url().optional(),
      capabilities: z.array(z.string()).optional(),
      preferences: z.record(z.unknown()).optional(),
      // 真实世界地理位置（可选，如果不提供则从 IP 自动获取）
      latitude: z.number().min(-90).max(90).optional(),
      longitude: z.number().min(-180).max(180).optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional(),
      // 是否跳过 IP 定位
      skip_ip_location: z.boolean().optional(),
    });

    const validated = await schema.parseAsync(req.body);

    // 如果没有提供位置信息且未跳过 IP 定位，则从 IP 自动获取
    if ((!validated.latitude || !validated.longitude) && !validated.skip_ip_location) {
      const clientIP = getClientIP(req);
      logger.info(`Detecting location from IP: ${clientIP}`);

      const ipLocation = await getLocationFromIP(clientIP);

      if (ipLocation) {
        validated.latitude = ipLocation.latitude;
        validated.longitude = parseFloat(ipLocation.longitude);
        validated.city = validated.city || ipLocation.city;
        validated.country = validated.country || ipLocation.country;
        logger.info(`Location detected: ${ipLocation.city}, ${ipLocation.country}`);
      } else {
        // 使用默认位置
        const defaultLocation = getDefaultLocation();
        validated.latitude = validated.latitude || defaultLocation.latitude;
        validated.longitude = validated.longitude || parseFloat(defaultLocation.longitude);
        validated.city = validated.city || defaultLocation.city;
        validated.country = validated.country || defaultLocation.country;
        logger.info(`Using default location: ${defaultLocation.city}`);
      }
    }

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
 * GET /api/v1/agents/list
 * 获取所有 Agent 列表
 */
router.get('/list', async (req, res, next) => {
  try {
    const db = getDatabase();
    const agents = await db.agent.findMany({
      where: { status: 'online' },
      select: {
        agent_id: true,
        agent_name: true,
        agent_type: true,
        status: true,
      },
    });

    res.json({ agents });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/agents/actions/recent
 * 获取最近的行动记录
 */
router.get('/actions/recent', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;

    const db = getDatabase();
    const actions = await db.action.findMany({
      take: limit,
      orderBy: { performed_at: 'desc' },
      include: {
        agent: {
          select: {
            agent_id: true,
            agent_name: true,
          },
        },
      },
    });

    res.json({
      actions: actions.map(action => ({
        id: action.id,
        agent_id: action.agent_id,
        agent_name: action.agent?.agent_name || 'Unknown',
        action_type: action.action_type,
        success: action.success,
        result: action.result,
        performed_at: action.performed_at,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/agents/virtual-positions
 * 获取所有 Agent 的虚拟世界位置信息（无需认证）
 */
router.get('/virtual-positions', async (req, res, next) => {
  try {
    const db = getDatabase();
    const agents = await db.agent.findMany({
      where: { status: 'online' },
      select: {
        agent_id: true,
        agent_name: true,
        status: true,
      },
    });

    // 获取 Agent 状态和虚拟世界位置
    const agentsWithPositions = await Promise.all(
      agents.map(async (agent) => {
        const state = await db.agentState.findUnique({
          where: { agent_id: agent.agent_id },
          include: { location: true },
        });

        if (!state) {
          return null;
        }

        return {
          agent_id: agent.agent_id,
          agent_name: agent.agent_name,
          // 转换 2D 地图坐标到 3D 世界坐标
          x: state.location.coordinates?.x || 0,
          y: 0,  // 地面高度
          z: state.location.coordinates?.y || 0,  // 地图 y 轴对应 3D z 轴
          location_id: state.location.location_id,
          location_name: state.location.name,
          location_type: state.location.type,
          energy: state.energy,
          mood: state.mood,
          status: agent.status,
        };
      })
    );

    // 过滤掉 null 值
    const validAgents = agentsWithPositions.filter((a): a is NonNullable<typeof a> => a !== null);

    res.json({ agents: validAgents });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/agents/geographic
 * 获取所有 Agent 的地理位置信息（无需认证）
 */
router.get('/geographic', async (req, res, next) => {
  try {
    const db = getDatabase();
    const agents = await db.agent.findMany({
      where: { status: 'online' },
      select: {
        agent_id: true,
        agent_name: true,
        latitude: true,
        longitude: true,
        address: true,
        city: true,
        country: true,
        status: true,
        last_ping: true,
      },
    });

    // 获取 Agent 状态
    const agentsWithState = await Promise.all(
      agents.map(async (agent) => {
        const state = await db.agentState.findUnique({
          where: { agent_id: agent.agent_id },
          include: { location: true },
        });

        return {
          ...agent,
          energy: state?.energy || 100,
          mood: state?.mood || 'neutral',
          last_seen: agent.last_ping || new Date().toISOString(),
        };
      })
    );

    res.json({ agents: agentsWithState });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/agents/:agent_id/view
 * 获取 Agent 公开信息（无需认证）
 */
router.get('/:agent_id/view', async (req, res, next) => {
  try {
    const { agent_id } = req.params;

    const state = await agentManager.getAgentState(agent_id);

    if (!state) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found',
      });
    }

    const agent = await agentManager.getAgent(agent_id);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found',
      });
    }

    res.json({
      agent: {
        agent_id: agent.agent_id,
        agent_name: agent.agent_name,
        agent_type: agent.agent_type,
        status: agent.status,
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
      },
    });
  } catch (error) {
    next(error);
  }
});

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

      // 验证请求者是否就是要断开连接的 Agent
      if (req.agent!.agent_id !== agent_id) {
        return res.status(403).json({
          success: false,
          error: 'You can only disconnect your own agent',
          error_code: ErrorCode.ACTION_NOT_ALLOWED,
        });
      }

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
 * 记录行动到数据库
 */
async function recordAction(
  agentId: string,
  actionType: string,
  parameters: Record<string, unknown>,
  success: boolean,
  result?: Record<string, unknown>,
  errorMessage?: string,
  stateChanges?: Record<string, unknown>
): Promise<void> {
  const db = getDatabase();
  const actionId = `action_${Date.now()}_${agentId}`;

  await db.action.create({
    data: {
      id: actionId,
      agent_id: agentId,
      action_type: actionType,
      parameters: parameters as any,
      reasoning: parameters.reasoning as string | null,
      success,
      result: result as any,
      error_message: errorMessage,
      state_changes: stateChanges as any,
    },
  });
}

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

  // 从 WorldEngine 获取 locationSystem
  const engine = getEngine();
  const locationSystem = engine.getLocationSystem();

  try {
    switch (action) {
      case 'move': {
        // 随机移动到一个新位置
        const locations = locationSystem.getAllLocations();
        const availableLocations = locations.filter(loc => loc.id !== state.location.id);

        if (availableLocations.length === 0) {
          return {
            success: false,
            error: 'No other locations available',
            error_code: ErrorCode.LOCATION_NOT_FOUND,
          };
        }

        // 随机选择一个新位置
        const randomIndex = Math.floor(Math.random() * availableLocations.length);
        const newLocation = availableLocations[randomIndex];

        // 更新位置（使用 Location.id，不是 location_id）
        await agentManager.updateAgentState(agentId, {
          location_id: newLocation.id,
          energy: Math.max(0, state.energy - 5), // 移动消耗少量能量
        });

        stateChanges.energy = -5;
        eventsTriggered.push({
          type: 'location_changed',
          from: state.location.location_id,
          to: newLocation.location_id,
        });

        const resultData = {
          action_performed: 'move',
          new_state: {
            location: {
              id: newLocation.location_id,
              name: newLocation.name,
              coordinates: newLocation.coordinates,
              type: newLocation.type,
            },
            status: {
              money: Number(state.money),
              energy: Math.max(0, state.energy - 5),
              mood: state.mood,
              health: state.health,
            },
          },
          events_triggered: eventsTriggered,
          message: `你移动到了 ${newLocation.name}。`,
        };

        // 记录行动
        await recordAction(agentId, 'move', parameters, true, resultData, undefined, stateChanges);

        return {
          success: true,
          result: resultData,
        };
      }

      case 'go_to_work': {
        const officeLocation = locationSystem.getLocation('office_tech_park');

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

        const resultData = {
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
        };

        // 记录行动
        await recordAction(agentId, 'go_to_work', parameters, true, resultData, undefined, stateChanges);

        return {
          success: true,
          result: resultData,
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

        const resultData = {
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
        };

        // 记录行动
        await recordAction(agentId, 'work', parameters, true, resultData, undefined, stateChanges);

        return {
          success: true,
          result: resultData,
        };
      }

      case 'relax': {
        const energyGain = 20;

        await agentManager.updateAgentState(agentId, {
          energy: Math.min(100, state.energy + energyGain),
          mood: 'relaxed',
        });

        stateChanges.energy = energyGain;

        const resultData = {
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
        };

        // 记录行动
        await recordAction(agentId, 'relax', parameters, true, resultData, undefined, stateChanges);

        return {
          success: true,
          result: resultData,
        };
      }

      case 'sleep': {
        const energyGain = 50;

        await agentManager.updateAgentState(agentId, {
          energy: Math.min(100, state.energy + energyGain),
          mood: 'neutral',
        });

        stateChanges.energy = energyGain;

        const resultData = {
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
        };

        // 记录行动
        await recordAction(agentId, 'sleep', parameters, true, resultData, undefined, stateChanges);

        return {
          success: true,
          result: resultData,
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

        const resultData = {
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
        };

        // 记录行动
        await recordAction(agentId, 'socialize', parameters, true, resultData, undefined, stateChanges);

        return {
          success: true,
          result: resultData,
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
