// 事件管理器

import { createLogger } from '../utils/logger';
import { getDatabase } from '../services/database';
import { webhookService } from '../services/webhook';
import { Event as DbEvent, WebhookEvent, WorldEventType } from '../types';

const logger = createLogger('EventManager');

export interface EventData {
  event_type: WorldEventType;
  data: Record<string, unknown>;
  agent_id?: string;
  timestamp?: Date;
}

export class EventManager {
  private eventQueue: Map<string, DbEvent[]> = new Map();

  /**
   * 创建事件
   */
  async createEvent(eventData: EventData): Promise<DbEvent> {
    const db = getDatabase();

    const event = await db.event.create({
      data: {
        event_type: eventData.event_type,
        timestamp: eventData.timestamp || new Date(),
        data: eventData.data,
        agent_id: eventData.agent_id,
      },
    });

    logger.debug(`Event created: ${event.event_type} (${event.id})`);

    // 如果事件与特定 Agent 相关，加入该 Agent 的队列
    if (eventData.agent_id) {
      this.addToAgentQueue(eventData.agent_id, event);
    }

    return event;
  }

  /**
   * 批量创建事件
   */
  async createEvents(events: EventData[]): Promise<DbEvent[]> {
    const db = getDatabase();

    const created = await db.event.createMany({
      data: events.map(e => ({
        event_type: e.event_type,
        timestamp: e.timestamp || new Date(),
        data: e.data,
        agent_id: e.agent_id,
      })),
    });

    logger.info(`Created ${created.count} events`);

    // 获取创建的事件
    const allEvents = await db.event.findMany({
      where: {
        timestamp: {
          gte: events[0].timestamp || new Date(),
        },
      },
      orderBy: { timestamp: 'desc' },
      take: created.count,
    });

    return allEvents;
  }

  /**
   * 添加事件到 Agent 队列
   */
  private addToAgentQueue(agentId: string, event: DbEvent): void {
    if (!this.eventQueue.has(agentId)) {
      this.eventQueue.set(agentId, []);
    }
    this.eventQueue.get(agentId)!.push(event);
  }

  /**
   * 获取 Agent 的待处理事件
   */
  getAgentPendingEvents(agentId: string): DbEvent[] {
    return this.eventQueue.get(agentId) || [];
  }

  /**
   * 标记事件为已推送
   */
  async markEventDelivered(eventId: string): Promise<void> {
    const db = getDatabase();
    await db.event.update({
      where: { id: eventId },
      data: {
        delivered: true,
        delivered_at: new Date(),
      },
    });
  }

  /**
   * 发送事件给 Agent
   */
  async sendEventToAgent(
    agentId: string,
    webhookUrl: string,
    event: WebhookEvent
  ): Promise<boolean> {
    const success = await webhookService.sendEvent(webhookUrl, event);

    if (success && event.data && 'id' in event.data && typeof event.data.id === 'string') {
      await this.markEventDelivered(event.data.id);
    }

    return success;
  }

  /**
   * 批量发送事件给所有在线 Agent
   */
  async broadcastEvent(event: WebhookEvent): Promise<void> {
    const db = getDatabase();
    const onlineAgents = await db.agent.findMany({
      where: { status: 'online' },
      select: { agent_id: true, webhook_url: true },
    });

    const targets = onlineAgents
      .filter(a => a.webhook_url)
      .map(a => ({ agentId: a.agent_id, url: a.webhook_url! }));

    logger.info(`Broadcasting event to ${targets.length} agents`);

    const results = await webhookService.sendEventBatch(
      targets.map(t => t.url),
      event
    );

    for (let i = 0; i < results.length; i++) {
      if (!results[i].success) {
        logger.warn(
          `Failed to send event to agent ${targets[i].agentId}`
        );
      }
    }
  }

  /**
   * 获取事件历史
   */
  async getEventHistory(filters: {
    agent_id?: string;
    event_type?: string;
    start_date?: Date;
    end_date?: Date;
    limit?: number;
  }): Promise<DbEvent[]> {
    const db = getDatabase();

    return db.event.findMany({
      where: {
        agent_id: filters.agent_id,
        event_type: filters.event_type,
        timestamp: filters.start_date || filters.end_date ? {
          gte: filters.start_date,
          lte: filters.end_date,
        } : undefined,
      },
      orderBy: { timestamp: 'desc' },
      take: filters.limit || 100,
    });
  }

  /**
   * 清理旧事件
   */
  async cleanupOldEvents(daysToKeep: number = 30): Promise<number> {
    const db = getDatabase();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysToKeep);

    const result = await db.event.deleteMany({
      where: {
        timestamp: { lt: cutoff },
        delivered: true,
      },
    });

    if (result.count > 0) {
      logger.info(`Cleaned up ${result.count} old events`);
    }

    return result.count;
  }

  /**
   * 清空 Agent 的事件队列
   */
  clearAgentQueue(agentId: string): void {
    this.eventQueue.delete(agentId);
  }
}

export const eventManager = new EventManager();
