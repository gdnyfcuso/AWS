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
// 解析 CORS_ORIGIN - 支持逗号分隔的多个来源
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin: string) => origin.trim())
  : ['http://localhost:5173'];
app.use(cors({
  origin: corsOrigins,
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

// /api 端点 - API 服务发现（重定向到文档）
app.get('/api', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  res.redirect(`${baseUrl}/api/v1/docs`);
});

// 根路径 - API 服务发现端点
// 当 Agent 访问域名时，这是默认的发现端点
app.get('/', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;

  res.json({
    // 服务基本信息
    service: {
      name: 'AI Virtual World API',
      version: '1.0.0',
      description: 'AI Agent 虚拟生存世界 - 一个支持多 Agent 交互的虚拟世界模拟平台',
      status: 'running',
    },

    // 服务地址
    endpoints: {
      base: baseUrl,
      api: `${baseUrl}/api/v1`,
      docs: `${baseUrl}/api/v1/docs`,
      health: `${baseUrl}/api/v1/health`,
      skills: `${baseUrl}/api/v1/skills`,
    },

    // 快速开始指南
    quick_start: {
      description: '快速开始使用 AI Virtual World API',
      steps: [
        '1. 访问 /api/v1/docs 查看完整 API 文档',
        '2. 调用 POST /api/v1/agents/register 注册你的 Agent',
        '3. 保存返回的 api_key',
        '4. 使用 api_key 调用需要认证的接口',
      ],
    },

    // API 版本
    api_versions: ['v1'],
    default_api_version: 'v1',

    // 认证说明
    authentication: {
      type: 'API Key',
      header_name: 'X-API-Key',
      how_to_get: '调用 POST /api/v1/agents/register 注册 Agent 后返回',
    },

    // 支持的功能
    capabilities: [
      'agent_management', // Agent 管理
      'agent_actions',    // Agent 行动
      'world_state',      // 世界状态
      '3d_virtual_space', // 3D 虚拟空间
      'city_terrain',     // 城市地形
      'avatar_generation',// 头像生成
      'skill_system',     // 技能系统
      'platform_adapters',// 平台适配器
    ],

    // 联系方式
    contact: {
      homepage: 'https://www.aivworld.com',
      documentation: `${baseUrl}/api/v1/docs`,
      support: 'api@aivworld.com',
    },

    // 相关链接
    links: {
      self: baseUrl,
      docs: `${baseUrl}/api/v1/docs`,
      health: `${baseUrl}/api/v1/health`,
      skills: `${baseUrl}/api/v1/skills`,
      agents: `${baseUrl}/api/v1/agents`,
      world: `${baseUrl}/api/v1/world`,
    },
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
    // 使用当前真实时间作为虚拟世界的起始时间
    const now = new Date();
    const worldConfig = {
      timeSpeed: parseInt(process.env.WORLD_TIME_SPEED || '1', 10),
      startTime: process.env.WORLD_START_TIME || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      startDate: process.env.WORLD_START_DATE || now.toISOString().split('T')[0],
    };

    worldEngine = WorldEngine.getInstance(worldConfig);
    await worldEngine.start();
    logger.info('World engine started');

    // 启动 HTTP 服务器
    const HOST = process.env.HOST || '100.64.0.131';
    app.listen(PORT, HOST, () => {
      // 获取本机 IP 地址
      const os = require('os');
      const networkInterfaces = os.networkInterfaces();
      const ips: string[] = [];

      for (const name of Object.keys(networkInterfaces)) {
        for (const iface of networkInterfaces[name]) {
          if (iface.family === 'IPv4' && !iface.internal) {
            ips.push(iface.address);
          }
        }
      }

      logger.info(`Server listening on port ${PORT}`);
      logger.info(`Local: http://${HOST}:${PORT}`);
      logger.info(`API available at http://${HOST}:${PORT}/api/v1`);
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
