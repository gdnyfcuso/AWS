// 世界引擎主类

import { createLogger } from '../utils/logger';
import { getDatabase } from '../services/database';
import { TimeSystem } from './TimeSystem';
import { LocationSystem } from './LocationSystem';
import { AgentManager } from './AgentManager';
import { eventManager } from './EventManager';
import { WorldTime, WorldConfig } from '../core/TimeSystem';

const logger = createLogger('WorldEngine');

export interface WorldStatus {
  running: boolean;
  time: WorldTime;
  active_agents: number;
  total_events_today: number;
  weather: string;
}

export class WorldEngine {
  private static instance: WorldEngine;
  private running = false;
  private timeSystem: TimeSystem;
  private locationSystem: LocationSystem;
  private agentManager: AgentManager;
  private config: WorldConfig;

  private constructor(config: WorldConfig) {
    this.config = config;
    this.timeSystem = new TimeSystem({
      speed: config.timeSpeed,
      startTime: config.startTime,
      startDate: config.startDate,
    });
    this.locationSystem = new LocationSystem();
    this.agentManager = new AgentManager();

    // 监听时间变化
    this.timeSystem.onChange(this.onTimeChange.bind(this));
  }

  static getInstance(config?: WorldConfig): WorldEngine {
    if (!WorldEngine.instance) {
      if (!config) {
        throw new Error('WorldEngine config required on first initialization');
      }
      WorldEngine.instance = new WorldEngine(config);
    }
    return WorldEngine.instance;
  }

  /**
   * 启动世界
   */
  async start(): Promise<void> {
    if (this.running) {
      logger.warn('WorldEngine already running');
      return;
    }

    logger.info('Starting WorldEngine...');

    // 初始化位置系统
    await this.locationSystem.initialize();
    await this.locationSystem.initializeDefaultLocations();

    // 启动时间系统
    this.timeSystem.start();

    this.running = true;
    logger.info('WorldEngine started successfully');
  }

  /**
   * 停止世界
   */
  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    logger.info('Stopping WorldEngine...');

    this.timeSystem.stop();
    this.running = false;

    logger.info('WorldEngine stopped');
  }

  /**
   * 获取世界状态
   */
  async getStatus(): Promise<WorldStatus> {
    const db = getDatabase();
    const worldState = await db.worldState.findFirstOrThrow();
    const onlineAgents = await db.agent.count({
      where: { status: 'online' },
    });

    return {
      running: this.running,
      time: {
        time: worldState.world_time,
        date: worldState.world_date,
        dayPhase: worldState.day_phase as WorldTime['dayPhase'],
        season: worldState.season as WorldTime['season'],
      },
      active_agents: onlineAgents,
      total_events_today: worldState.total_events_today,
      weather: worldState.weather,
    };
  }

  /**
   * 时间变化处理
   */
  private async onTimeChange(time: WorldTime): Promise<void> {
    logger.debug(`Time changed to ${time.date} ${time.time}`);

    // 检查是否需要触发定时事件
    await this.checkScheduledEvents(time);

    // 更新 Agent 的可用行动
    await this.updateAgentActions(time);
  }

  /**
   * 检查并触发定时事件
   */
  private async checkScheduledEvents(time: WorldTime): Promise<void> {
    const [hour] = time.time.split(':').map(Number);

    // 早上 8 点 - 唤醒事件
    if (hour === 8) {
      await this.triggerMorningEvent();
    }
    // 晚上 22 点 - 睡眠提醒
    else if (hour === 22) {
      await this.triggerNightEvent();
    }
    // 整点 - 天气可能变化
    else {
      await this.potentiallyUpdateWeather();
    }
  }

  /**
   * 触发早晨事件
   */
  private async triggerMorningEvent(): Promise<void> {
    const db = getDatabase();
    const onlineAgents = await db.agent.findMany({
      where: { status: 'online' },
      select: { agent_id: true, webhook_url: true },
    });

    for (const agent of onlineAgents) {
      if (agent.webhook_url) {
        await eventManager.sendEventToAgent(agent.agent_id, agent.webhook_url, {
          event_type: 'world_event',
          timestamp: new Date().toISOString(),
          event: {
            type: 'morning_announcement',
            description: '早上好！新的一天开始了。',
          },
        });
      }
    }

    logger.info('Morning event triggered');
  }

  /**
   * 触发夜晚事件
   */
  private async triggerNightEvent(): Promise<void> {
    const db = getDatabase();
    const onlineAgents = await db.agent.findMany({
      where: { status: 'online' },
      select: { agent_id: true, webhook_url: true },
    });

    for (const agent of onlineAgents) {
      if (agent.webhook_url) {
        await eventManager.sendEventToAgent(agent.agent_id, agent.webhook_url, {
          event_type: 'world_event',
          timestamp: new Date().toISOString(),
          event: {
            type: 'night_announcement',
            description: '夜深了，该休息了。',
          },
        });
      }
    }

    logger.info('Night event triggered');
  }

  /**
   * 随机更新天气
   */
  private async potentiallyUpdateWeather(): Promise<void> {
    // 10% 概率天气变化
    if (Math.random() > 0.1) {
      return;
    }

    const weathers = ['sunny', 'cloudy', 'rainy', 'snowy'] as const;
    const newWeather = weathers[Math.floor(Math.random() * weathers.length)];

    const db = getDatabase();
    await db.worldState.updateMany({
      data: { weather: newWeather },
    });

    // 广播天气变化
    await eventManager.broadcastEvent({
      event_type: 'world_event',
      timestamp: new Date().toISOString(),
      event: {
        type: 'weather_change',
        from: 'unknown',
        to: newWeather,
        description: `天气变成了${newWeather}`,
      },
    });

    logger.info(`Weather changed to ${newWeather}`);
  }

  /**
   * 更新 Agent 的可用行动
   */
  private async updateAgentActions(time: WorldTime): Promise<void> {
    // 这个方法可以用来根据时间调整 Agent 的可用行动
    // 例如：夜间某些行动不可用
  }

  /**
   * 获取子系统
   */
  getTimeSystem(): TimeSystem {
    return this.timeSystem;
  }

  getLocationSystem(): LocationSystem {
    return this.locationSystem;
  }

  getAgentManager(): AgentManager {
    return this.agentManager;
  }

  getEventManager() {
    return eventManager;
  }
}
