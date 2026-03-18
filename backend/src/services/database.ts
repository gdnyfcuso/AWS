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

  if (!existingState) {
    const initialState = {
      world_time: process.env.WORLD_START_TIME || '08:00',
      world_date: process.env.WORLD_START_DATE || new Date().toISOString().split('T')[0],
      day_phase: 'morning',
      weather: 'sunny',
      season: 'spring',
      active_agents: 0,
      total_events_today: 0,
    };

    await db.worldState.create({ data: initialState });
    logger.info('Initial world state created');
  }
}
