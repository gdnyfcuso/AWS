// Agent 自主行为循环系统

import { createLogger } from '../utils/logger';
import { getDatabase } from '../services/database';
import { webhookService } from '../services/webhook';
import { agentManager } from '../core/AgentManager';
import type { WebhookEvent, WorldTime } from '../types';

const logger = createLogger('AgentBehaviorLoop');

export interface BehaviorLoopConfig {
  interval: number; // 行为决策间隔（秒）
  enabled: boolean;
}

export class AgentBehaviorLoop {
  private interval: NodeJS.Timeout | null = null;
  private config: BehaviorLoopConfig;

  constructor(config: BehaviorLoopConfig) {
    this.config = config;
  }

  /**
   * 启动行为循环
   */
  start(worldTime: WorldTime): void {
    if (this.interval) {
      return;
    }

    logger.info(`Starting Agent behavior loop with ${this.config.interval}s interval`);

    this.interval = setInterval(async () => {
      await this.tick();
    }, this.config.interval * 1000);

    // 立即执行一次
    this.tick();
  }

  /**
   * 停止行为循环
   */
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      logger.info('Agent behavior loop stopped');
    }
  }

  /**
   * 每次循环执行
   */
  private async tick(): Promise<void> {
    try {
      // 获取所有在线 Agent
      const onlineAgents = await agentManager.getOnlineAgents();

      logger.debug(`Processing behavior for ${onlineAgents.length} agents`);

      // 为每个 Agent 推送世界状态
      for (const agent of onlineAgents) {
        await this.pushWorldState(agent.agent_id, agent.agent_name);
      }
    } catch (error) {
      logger.error('Error in behavior loop tick', error);
    }
  }

  /**
   * 推送世界状态给 Agent
   */
  private async pushWorldState(agentId: string, agentName: string): Promise<void> {
    try {
      const state = await agentManager.getAgentState(agentId);
      if (!state) {
        return;
      }

      const nearbyAgents = await agentManager.getNearbyAgents(state.location_id, agentId);
      const availableActions = await agentManager.getAvailableActions(agentId);

      // 构建世界状态事件
      const event: WebhookEvent = {
        event_type: 'state_update',
        timestamp: new Date().toISOString(),
        world_state: {
          time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
          date: new Date().toLocaleDateString('zh-CN'),
          weather: 'sunny',
          season: 'spring',
        },
        agent_state: {
          agent_id: agentId,
          location: {
            id: state.location.location_id,
            name: state.location.name,
            coordinates: state.location.coordinates,
            type: state.location.type,
          },
          status: {
            money: Number(state.money),
            energy: state.energy,
            mood: state.mood,
            health: state.health,
          },
          nearby_agents: nearbyAgents,
          available_actions: availableActions.map(action => ({
            action,
            display_name: getActionDisplayName(action),
            description: getActionDescription(action),
          })),
        },
      };

      // 推送给 Agent（如果有 webhook_url）
      const agent = await agentManager.getAgent(agentId);
      if (agent?.webhook_url) {
        await webhookService.sendEvent(agent.webhook_url, event);
        logger.debug(`World state pushed to ${agentName}`);
      }
    } catch (error) {
      logger.error(`Error pushing world state to ${agentId}`, error);
    }
  }

  /**
   * 处理 Agent 的行动决策
   */
  async handleAgentAction(
    agentId: string,
    action: string,
    parameters?: Record<string, unknown>
  ): Promise<boolean> {
    try {
      const agent = await agentManager.getAgent(agentId);
      if (!agent) {
        logger.error(`Agent not found: ${agentId}`);
        return false;
      }

      // 通过 API 执行行动
      const response = await fetch(`http://localhost:3000/api/v1/agents/${agentId}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${agent.api_key}`,
        },
        body: JSON.stringify({ action, parameters }),
      });

      const result = await response.json();

      if (result.success) {
        logger.info(`${agent.agent_name} executed action: ${action}`);
        return true;
      } else {
        logger.error(`Action failed for ${agentId}: ${result.error}`);
        return false;
      }
    } catch (error) {
      logger.error(`Error handling action for ${agentId}`, error);
      return false;
    }
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<BehaviorLoopConfig>): void {
    this.config = { ...this.config, ...config };

    // 如果间隔改变，重启循环
    if (config.interval !== undefined && this.interval) {
      this.stop();
      // WorldEngine 会重新调用 start
    }
  }
}

// 行动名称映射
function getActionDisplayName(action: string): string {
  const names: Record<string, string> = {
    work: '工作',
    relax: '休息',
    sleep: '睡觉',
    go_to_work: '去上班',
    go_home: '回家',
    socialize: '社交',
    chat: '聊天',
    make_friends: '交朋友',
    trade: '交易',
    buy_item: '购物',
  };
  return names[action] || action;
}

// 行动描述
function getActionDescription(action: string): string {
  const descriptions: Record<string, string> = {
    work: '工作赚钱，消耗能量',
    relax: '休息恢复少量能量',
    sleep: '睡觉恢复大量能量',
    go_to_work: '前往工作地点',
    go_home: '返回家中',
    socialize: '与其他 Agent 社交',
    chat: '与某人聊天',
    make_friends: '建立好友关系',
    trade: '交易金币',
    buy_item: '购买物品',
  };
  return descriptions[action] || '';
}

// 单例
let behaviorLoop: AgentBehaviorLoop | null = null;

export function getBehaviorLoop(config?: BehaviorLoopConfig): AgentBehaviorLoop {
  if (!behaviorLoop) {
    behaviorLoop = new AgentBehaviorLoop(config || {
      interval: 300, // 5分钟
      enabled: true,
    });
  }
  return behaviorLoop;
}
