// API v1 路由汇总

import { Router } from 'express';
import agentsRouter from './agents';
import worldRouter from './world';

const router = Router();

// 挂载子路由
router.use('/agents', agentsRouter);
router.use('/world', worldRouter);

// 健康检查
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

export default router;
