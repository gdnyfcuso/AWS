// World API 路由

import { Router } from 'express';
import { WorldEngine } from '../../core';
import { optionalAuth } from '../middleware/auth';
import { createLogger } from '../../utils/logger';

const logger = createLogger('WorldAPI');
const router = Router();

// 获取世界引擎实例
const getEngine = () => WorldEngine.getInstance();

/**
 * GET /api/v1/world/state
 * 获取世界状态
 */
router.get('/state', optionalAuth, async (req, res, next) => {
  try {
    const engine = getEngine();
    const status = await engine.getStatus();
    const locationSystem = engine.getLocationSystem();

    const locations = locationSystem.getAllLocations().map(loc => ({
      id: loc.location_id,
      name: loc.name,
      type: loc.type,
      agents_present: loc.current_agents,
    }));

    res.json({
      world_state: {
        time: status.time.time,
        date: status.time.date,
        weather: status.weather as 'sunny' | 'cloudy' | 'rainy' | 'snowy',
        season: status.time.season,
        active_agents: status.active_agents,
      },
      locations,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/world/status
 * 获取世界运行状态
 */
router.get('/status', optionalAuth, async (req, res, next) => {
  try {
    const engine = getEngine();
    const status = await engine.getStatus();

    res.json(status);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/world/time
 * 设置世界时间（调试用）
 */
router.post('/time', async (req, res, next) => {
  try {
    const schema = {
      time: 'string',
      date: 'string?',
    };

    const { time, date } = req.body;

    if (!time || typeof time !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid time parameter',
      });
    }

    const engine = getEngine();
    const timeSystem = engine.getTimeSystem();
    await timeSystem.setTime(time, date);

    res.json({
      success: true,
      message: 'Time updated',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
