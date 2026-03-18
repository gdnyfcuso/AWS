// API v1 路由汇总

import { Router } from 'express';
import agentsRouter from './agents';
import worldRouter from './world';
import avatarRouter from './avatar';
import platformRouter from './platform';

const router = Router();

// 挂载子路由
router.use('/agents', agentsRouter);
router.use('/world', worldRouter);
router.use('/avatar', avatarRouter);
router.use('/platform', platformRouter);

// 健康检查
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

export default router;
