// 数据库服务

import { PrismaClient } from '@prisma/client';
import { createLogger } from '../utils/logger';

const logger = createLogger('Database');

// Prisma Client 扩展
class DatabaseService extends PrismaClient {
  constructor() {
    super({
      log: process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
    });
  }

  async connect(): Promise<void> {
    try {
      await this.$connect();
      logger.info('Database connected successfully');
    } catch (error) {
      logger.error('Failed to connect to database', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.$disconnect();
    logger.info('Database disconnected');
  }

  // 清理过期数据
  async cleanupExpiredData(): Promise<void> {
    const now = new Date();
    const offlineTimeout = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24小时

    // 清理长时间离线的 Agent
    const expiredAgents = await this.agent.updateMany({
      where: {
        status: 'offline',
        disconnected_at: { lt: offlineTimeout },
      },
      data: { status: 'archived' },
    });

    if (expiredAgents.count > 0) {
      logger.info(`Archived ${expiredAgents.count} expired agents`);
    }
  }
}

// 单例
let db: DatabaseService | null = null;

export function getDatabase(): DatabaseService {
  if (!db) {
    db = new DatabaseService();
  }
  return db;
}

export async function initDatabase(): Promise<void> {
  const database = getDatabase();
  await database.connect();

  // 初始化世界状态
  await initWorldState();
}

async function initWorldState(): Promise<void> {
  const db = getDatabase();

  // 检查是否已有世界状态
  const existingState = await db.worldState.findFirst();

  // 使用当前真实时间作为虚拟世界时间
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

  // 确定时段
  let dayPhase: 'morning' | 'afternoon' | 'evening' | 'night';
  if (currentHour >= 5 && currentHour < 12) dayPhase = 'morning';
  else if (currentHour >= 12 && currentHour < 18) dayPhase = 'afternoon';
  else if (currentHour >= 18 && currentHour < 22) dayPhase = 'evening';
  else dayPhase = 'night';

  // 确定季节
  const month = now.getMonth() + 1;
  let season: 'spring' | 'summer' | 'autumn' | 'winter';
  if (month >= 3 && month <= 5) season = 'spring';
  else if (month >= 6 && month <= 8) season = 'summer';
  else if (month >= 9 && month <= 11) season = 'autumn';
  else season = 'winter';

  if (!existingState) {
    const initialState = {
      world_time: currentTimeStr,
      world_date: now.toISOString().split('T')[0],
      day_phase: dayPhase,
      weather: 'sunny',
      season: season,
      active_agents: 0,
      total_events_today: 0,
    };

    await db.worldState.create({ data: initialState });
    logger.info(`Initial world state created with time: ${currentTimeStr}`);
  } else {
    // 更新现有世界状态为当前真实时间
    await db.worldState.updateMany({
      data: {
        world_time: currentTimeStr,
        world_date: now.toISOString().split('T')[0],
        day_phase: dayPhase,
        season: season,
      },
    });
    logger.info(`World state updated to current time: ${currentTimeStr}`);
  }
}
