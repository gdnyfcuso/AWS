// Agent 自动行为模拟器

import { createLogger } from '../utils/logger';
import { getDatabase } from '../services/database';
import { agentManager } from '../core/AgentManager';

const logger = createLogger('AgentSimulator');

// 服务器URL，用于内部API调用
const SERVER_URL = process.env.SERVER_URL || `http://${process.env.HOST || 'localhost'}:${process.env.PORT || '3000'}`;

export class AgentSimulator {
  private interval: NodeJS.Timeout | null = null;

  /**
   * 启动模拟器
   */
  start(intervalSeconds: number = 30): void {
    if (this.interval) {
      return;
    }

    logger.info(`Starting Agent simulator with ${intervalSeconds}s interval`);

    this.interval = setInterval(async () => {
      await this.simulateAgents();
    }, intervalSeconds * 1000);

    // 立即执行一次
    this.simulateAgents();
  }

  /**
   * 停止模拟器
   */
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      logger.info('Agent simulator stopped');
    }
  }

  /**
   * 模拟所有在线 Agent 的行为
   */
  private async simulateAgents(): Promise<void> {
    try {
      const db = getDatabase();
      const onlineAgents = await db.agent.findMany({
        where: { status: 'online' },
        include: {
          state: true,
        },
      });

      logger.debug(`Simulating behavior for ${onlineAgents.length} agents`);

      for (const agentData of onlineAgents) {
        await this.simulateAgent(agentData);
      }
    } catch (error) {
      logger.error('Error in agent simulation', error);
    }
  }

  /**
   * 模拟单个 Agent 的行为
   */
  private async simulateAgent(agentData: any): Promise<void> {
    // agentData 直接包含 agent 字段和嵌套的 state
    const state = agentData.state;

    // 检查状态是否存在
    if (!state) {
      logger.warn(`Agent ${agentData.agent_id} has no state, skipping`);
      return;
    }

    // 根据状态决定行动
    const action = this.decideAction(state);
    if (!action) {
      logger.debug(`No action decided for ${agentData.agent_id}`);
      return;
    }

    logger.debug(`${agentData.agent_name} (${agentData.agent_id}) decided action: ${action}`);

    try {
      const response = await fetch(`${SERVER_URL}/api/v1/agents/${agentData.agent_id}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${agentData.api_key}`,
        },
        body: JSON.stringify({ action }),
      });

      const result = await response.json();

      if (result.success) {
        logger.info(`${agentData.agent_name} (${agentData.agent_id}): ${action} - ${result.result?.message || 'Success'}`);
      } else {
        logger.warn(`${agentData.agent_name} (${agentData.agent_id}): ${action} - Failed: ${result.error}`);
      }
    } catch (error) {
      logger.error(`Error simulating ${agentData.agent_id}`, error);
    }
  }

  /**
   * 根据状态决定行动
   */
  private decideAction(state: any): string | null {
    const { energy, mood } = state;

    // 能量低，需要休息
    if (energy < 30) {
      if (energy < 10) {
        return 'sleep';
      }
      return 'relax';
    }

    // 心情好且能量充足，去工作
    if (mood === 'focused' || mood === 'neutral') {
      if (energy > 50) {
        return 'work';
      }
    }

    // 随机行为 - 添加 move 选项
    const actions = ['move', 'work', 'relax', 'socialize'];
    const weights = [3, 4, 3, 2]; // move 权重较高

    // 根据能量调整权重
    if (energy < 50) {
      weights[1] = 1; // work 权重降低
      weights[2] = 5; // relax 权重提高
    }

    return this.weightedRandom(actions, weights);
  }

  /**
   * 加权随机选择
   */
  private weightedRandom(items: string[], weights: number[]): string {
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < items.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return items[i];
      }
    }

    return items[items.length - 1];
  }
}

// 单例
let simulator: AgentSimulator | null = null;

export function getSimulator(): AgentSimulator {
  if (!simulator) {
    simulator = new AgentSimulator();
  }
  return simulator;
}
