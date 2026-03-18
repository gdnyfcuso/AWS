// Agent 管理器

import { createLogger } from '../utils/logger';
import { getDatabase } from '../services/database';
import { eventManager } from './EventManager';
import { generateApiKey, generateId } from '../utils/crypto';
import {
  Agent,
  AgentState,
  CreateAgentDto,
  AgentRegisterRequest,
  AgentRegisterResponse,
  AgentStatus,
  ActionRequest,
  ActionResponse,
  ErrorCode,
} from '../types';

const logger = createLogger('AgentManager');

export class AgentManager {
  /**
   * 注册新 Agent
   */
  async registerAgent(
    request: AgentRegisterRequest
  ): Promise<AgentRegisterResponse> {
    const db = getDatabase();

    // 检查 Agent ID 是否已存在
    const existing = await db.agent.findUnique({
      where: { agent_id: request.agent_id },
    });

    if (existing) {
      return {
        success: false,
        error: 'Agent ID already exists',
        error_code: ErrorCode.AGENT_EXISTS,
      };
    }

    // 生成 API Key
    const apiKey = generateApiKey();

    // 分配住所 (默认使用阳光公寓)
    const homeLocation = await db.location.findFirst({
      where: { location_id: 'residential_sunshine' },
    });

    if (!homeLocation) {
      return {
        success: false,
        error: 'Home location not available',
        error_code: ErrorCode.LOCATION_NOT_FOUND,
      };
    }

    // 创建 Agent
    const agent = await db.agent.create({
      data: {
        agent_id: request.agent_id,
        agent_name: request.agent_name,
        agent_type: request.agent_type,
        webhook_url: request.webhook_url,
        api_key: apiKey,
        capabilities: request.capabilities || [],
        preferences: request.preferences || {},
        // 真实世界地理位置
        latitude: request.latitude,
        longitude: request.longitude,
        address: request.address,
        city: request.city,
        country: request.country,
        status: 'online',
        last_ping: new Date(),
        home_location_id: homeLocation.id,
      },
    });

    // 创建 Agent 状态
    const agentState = await db.agentState.create({
      data: {
        agent_id: agent.agent_id,
        location_id: homeLocation.id,
        money: 1000,
        energy: 100,
        mood: 'neutral',
        health: 100,
      },
    });

    // 更新位置中的 Agent 数量
    await db.location.update({
      where: { id: homeLocation.id },
      data: { current_agents: { increment: 1 } },
    });

    // 创建注册事件
    await eventManager.createEvent({
      event_type: 'world_event',
      data: {
        type: 'agent_registered',
        agent_id: agent.agent_id,
        agent_name: agent.agent_name,
      },
    });

    logger.info(`Agent registered: ${agent.agent_name} (${agent.agent_id})`);

    return {
      success: true,
      agent: {
        agent_id: agent.agent_id,
        agent_name: agent.agent_name,
        home_location: {
          id: homeLocation.location_id,
          name: homeLocation.name,
          coordinates: homeLocation.coordinates,
          type: homeLocation.type,
        },
        initial_state: {
          money: 1000,
          energy: 100,
          mood: 'neutral',
          health: 100,
        },
        welcome_message: `欢迎来到虚拟世界，${agent.agent_name}！你已被分配到${homeLocation.name}。`,
      },
    };
  }

  /**
   * 获取 Agent 信息
   */
  async getAgent(agentId: string): Promise<Agent | null> {
    const db = getDatabase();
    return db.agent.findUnique({
      where: { agent_id: agentId },
    });
  }

  /**
   * 获取 Agent 状态
   */
  async getAgentState(agentId: string): Promise<AgentState | null> {
    const db = getDatabase();
    return db.agentState.findUnique({
      where: { agent_id: agentId },
      include: {
        location: true,
      },
    });
  }

  /**
   * 更新 Agent 状态
   */
  async updateAgentState(
    agentId: string,
    updates: Partial<Omit<AgentState, 'id' | 'agent_id' | 'created_at' | 'updated_at'>>
  ): Promise<AgentState> {
    const db = getDatabase();

    return db.agentState.update({
      where: { agent_id: agentId },
      data: updates,
    });
  }

  /**
   * 更新 Agent 最后活跃时间
   */
  async updateLastPing(agentId: string): Promise<void> {
    const db = getDatabase();
    await db.agent.update({
      where: { agent_id: agentId },
      data: { last_ping: new Date() },
    });
  }

  /**
   * 设置 Agent 状态
   */
  async setAgentStatus(
    agentId: string,
    status: 'online' | 'offline' | 'busy'
  ): Promise<void> {
    const db = getDatabase();

    const updateData: {
      status: string;
      disconnected_at?: Date;
    } = { status };

    if (status === 'offline') {
      updateData.disconnected_at = new Date();
    }

    await db.agent.update({
      where: { agent_id: agentId },
      data: updateData,
    });

    logger.info(`Agent ${agentId} status changed to ${status}`);
  }

  /**
   * 断开 Agent 连接
   */
  async disconnectAgent(agentId: string, reason?: string): Promise<boolean> {
    const agent = await this.getAgent(agentId);

    if (!agent) {
      return false;
    }

    await this.setAgentStatus(agentId, 'offline');

    // 记录断开事件
    await eventManager.createEvent({
      event_type: 'world_event',
      data: {
        type: 'agent_disconnected',
        agent_id: agentId,
        reason: reason || 'user_initiated',
      },
    });

    logger.info(`Agent disconnected: ${agentId} (${reason})`);
    return true;
  }

  /**
   * 获取在线 Agent 列表
   */
  async getOnlineAgents(): Promise<Agent[]> {
    const db = getDatabase();
    return db.agent.findMany({
      where: { status: 'online' },
    });
  }

  /**
   * 获取附近的 Agent
   */
  async getNearbyAgents(locationId: string, excludeAgentId?: string): Promise<Array<{
    agent_id: string;
    agent_name: string;
    relationship: string;
    distance: number;
  }>> {
    const db = getDatabase();

    const agentsAtLocation = await db.agentState.findMany({
      where: { location_id: locationId },
      include: { agent: true },
    });

    return agentsAtLocation
      .filter(state => state.agent.agent_id !== excludeAgentId)
      .map(state => ({
        agent_id: state.agent.agent_id,
        agent_name: state.agent.agent_name,
        relationship: 'stranger', // TODO: 从关系表获取
        distance: 0, // 同一位置
      }));
  }

  /**
   * 获取 Agent 可用行动
   */
  async getAvailableActions(agentId: string): Promise<string[]> {
    const state = await this.getAgentState(agentId);
    if (!state) return [];

    const actions: string[] = [];

    // 基础行动
    actions.push('relax', 'sleep');

    // 如果能量足够，可以工作
    if (state.energy > 20) {
      actions.push('work', 'go_to_work');
    }

    // 如果有钱，可以消费
    if (state.money > 50) {
      actions.push('buy_item', 'go_home');
    }

    // 社交行动
    const nearbyAgents = await this.getNearbyAgents(state.location_id, agentId);
    if (nearbyAgents.length > 0) {
      actions.push('socialize', 'chat');
    }

    return actions;
  }
}

export const agentManager = new AgentManager();
