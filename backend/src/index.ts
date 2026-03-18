// Agent World Backend - 主入口

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { initDatabase, getDatabase } from './services/database';
import { WorldEngine } from './core';
import apiV1Router from './api/v1';
import { errorHandler, notFoundHandler } from './api/middleware/errorHandler';
import { createLogger } from './utils/logger';

// 加载环境变量
dotenv.config();

const logger = createLogger('Server');
const PORT = process.env.PORT || 3000;

// 创建 Express 应用
const app = express();

// 中间件
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 请求日志
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.path}`);
  next();
});

// API 路由
app.use('/api/v1', apiV1Router);

// 根路径
app.get('/', (req, res) => {
  res.json({
    name: 'Agent World API',
    version: '1.0.0',
    description: 'AI Agent Virtual World API Server',
    documentation: '/api/v1/docs',
  });
});

// 错误处理
app.use(notFoundHandler);
app.use(errorHandler);

// 世界引擎实例
let worldEngine: WorldEngine;

/**
 * 启动服务器
 */
async function start(): Promise<void> {
  try {
    logger.info('Starting Agent World Backend...');

    // 初始化数据库
    await initDatabase();
    logger.info('Database initialized');

    // 创建并启动世界引擎
    const worldConfig = {
      timeSpeed: parseInt(process.env.WORLD_TIME_SPEED || '1', 10),
      startTime: process.env.WORLD_START_TIME || '08:00',
      startDate: process.env.WORLD_START_DATE || new Date().toISOString().split('T')[0],
    };

    worldEngine = WorldEngine.getInstance(worldConfig);
    await worldEngine.start();
    logger.info('World engine started');

    // 启动 HTTP 服务器
    app.listen(PORT, () => {
      logger.info(`Server listening on port ${PORT}`);
      logger.info(`API available at http://localhost:${PORT}/api/v1`);
      logger.info(`Health check at http://localhost:${PORT}/api/v1/health`);
    });

    // 优雅关闭
    setupGracefulShutdown();

  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

/**
 * 优雅关闭处理
 */
function setupGracefulShutdown(): void {
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}, shutting down gracefully...`);

    try {
      // 停止世界引擎
      if (worldEngine) {
        await worldEngine.stop();
      }

      // 关闭数据库连接
      const db = getDatabase();
      await db.disconnect();

      logger.info('Shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// 启动服务器
start().catch((error) => {
  logger.error('Unhandled error during startup', error);
  process.exit(1);
});
