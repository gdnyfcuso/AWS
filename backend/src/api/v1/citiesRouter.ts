// 城市级地形 API 路由

import { Router } from 'express';
import * as citiesController from './cities';

const router = Router();

// 城市列表
router.get('/', citiesController.getCities);
router.get('/:cityId', citiesController.getCityDetail);

// 城市地形数据
router.get('/:cityId/terrain', citiesController.getTerrainByCity);

// 根据Agent获取地形
router.get('/agent/:agentId/terrain', citiesController.getTerrainByAgent);

// 根据坐标获取地形
router.get('/coordinates/terrain', citiesController.getTerrainByCoordinates);

// 缓存管理
router.post('/cache/clear', citiesController.clearTerrainCache);
router.post('/:cityId/regenerate', citiesController.regenerateTerrain);

export default router;
