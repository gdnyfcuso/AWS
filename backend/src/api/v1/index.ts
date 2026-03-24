// API v1 路由汇总

import { Router } from 'express';
import agentsRouter from './agents';
import worldRouter from './world';
import avatarRouter from './avatar';
import platformRouter from './platform';
import world3dRouter from './world3d';
import skillsRouter from './skills';
import citiesRouter from './citiesRouter';
import docsRouter from './docs';

const router = Router();

// 挂载子路由
router.use('/agents', agentsRouter);
router.use('/world', worldRouter);
router.use('/avatar', avatarRouter);
router.use('/platform', platformRouter);
router.use('/world3d', world3dRouter);
router.use('/skills', skillsRouter);
router.use('/cities', citiesRouter);

// API 文档（放在前面，避免被其他路由匹配）
router.use('/docs', docsRouter);

// 健康检查
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

export default router;
