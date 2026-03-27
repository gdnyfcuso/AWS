/**
 * 测试环境设置
 * 在所有测试运行前执行
 */

import { vi } from 'vitest';

// Mock console 方法以减少测试输出噪音
global.console = {
  ...console,
  // 在开发环境中保留日志，在 CI 中可以禁用
  // log: vi.fn(),
  // debug: vi.fn(),
  // info: vi.fn(),
  // warn: vi.fn(),
  // error: vi.fn(),
};

// Mock process.env
process.env = {
  ...process.env,
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  PORT: '3001',
  WORLD_TIME_SPEED: '1',
};

// 设置测试超时
vi.setConfig({ testTimeout: 10000 });
