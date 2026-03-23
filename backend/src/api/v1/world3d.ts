// 地形、道路、车辆 API 路由

import { Router } from 'express';
import * as terrainController from './terrain';

const router = Router();

// 地形特征
router.get('/terrain', terrainController.getTerrainFeatures);
router.get('/terrain/type/:type', terrainController.getTerrainByType);
router.get('/terrain/render-data', terrainController.getTerrainRenderData);

// 道路网络
router.get('/roads', terrainController.getRoads);
router.get('/roads/network', terrainController.getRoadNetwork);

// 车辆
router.get('/vehicles', terrainController.getVehicles);
router.get('/vehicles/:vehicleId', terrainController.getVehicle);
router.post('/vehicles', terrainController.createVehicle);

export default router;
