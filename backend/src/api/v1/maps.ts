// 地图 API 路由

import { Router } from 'express';
import { countryMapSystem, CHINA_REGIONS, RegionConfig } from '../../core/CountryMapSystem';
import { cityGeographySystem } from '../../core/CityGeography';
import { roadNetwork } from '../../core/RoadNetwork';
import { mapCoordinateSystem } from '../../core/MapCoordinateSystem';
import { createLogger } from '../../utils/logger';

const logger = createLogger('MapsAPI');
const router = Router();

/**
 * GET /api/v1/maps/regions
 * 获取所有地区列表
 */
router.get('/regions', (req, res) => {
  try {
    const { type, parent_id } = req.query;

    let regions: RegionConfig[] = Object.values(CHINA_REGIONS);

    // 按类型筛选
    if (type) {
      regions = regions.filter(r => r.type === type);
    }

    // 按父级筛选
    if (parent_id) {
      const parent = countryMapSystem.getRegion(parent_id as string);
      if (parent && parent.children) {
        regions = parent.children
          .map(childId => countryMapSystem.getRegion(childId))
          .filter((r): r is RegionConfig => r !== undefined);
      } else {
        regions = [];
      }
    }

    res.json({
      success: true,
      regions: regions.map(r => ({
        id: r.id,
        name: r.name,
        name_en: r.nameEn,
        type: r.type,
        coordinates: r.coordinates,
        zoom: r.zoom,
        parent_id: r.parentId,
        has_children: r.children && r.children.length > 0,
        children_count: r.children?.length || 0,
        description: r.description,
      })),
    });
  } catch (error) {
    logger.error('Error getting regions', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/v1/maps/regions/:region_id
 * 获取指定地区的详细信息
 */
router.get('/regions/:region_id', (req, res) => {
  try {
    const { region_id } = req.params;

    const region = countryMapSystem.getRegion(region_id);

    if (!region) {
      return res.status(404).json({
        success: false,
        error: 'Region not found',
      });
    }

    // 获取父地区
    const parent = region.parentId ? countryMapSystem.getRegion(region.parentId) : null;

    // 获取子地区
    const children = countryMapSystem.getChildren(region_id);

    // 获取路径
    const path = countryMapSystem.getPath(region_id);

    // 获取统计信息
    const stats = countryMapSystem.getRegionStats(region_id);

    res.json({
      success: true,
      region: {
        id: region.id,
        name: region.name,
        name_en: region.nameEn,
        type: region.type,
        coordinates: region.coordinates,
        zoom: region.zoom,
        parent_id: region.parentId,
        parent: parent ? {
          id: parent.id,
          name: parent.name,
          type: parent.type,
        } : null,
        children: children.map(c => ({
          id: c.id,
          name: c.name,
          type: c.type,
          has_children: c.children && c.children.length > 0,
        })),
        path: path.map(p => ({
          id: p.id,
          name: p.name,
          type: p.type,
        })),
        description: region.description,
        stats,
      },
    });
  } catch (error) {
    logger.error('Error getting region', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/v1/maps/regions/:region_id/children
 * 获取指定地区的子地区列表
 */
router.get('/regions/:region_id/children', (req, res) => {
  try {
    const { region_id } = req.params;

    const children = countryMapSystem.getChildren(region_id);

    res.json({
      success: true,
      children: children.map(c => ({
        id: c.id,
        name: c.name,
        name_en: c.nameEn,
        type: c.type,
        coordinates: c.coordinates,
        zoom: c.zoom,
        has_children: c.children && c.children.length > 0,
        children_count: c.children?.length || 0,
        description: c.description,
      })),
    });
  } catch (error) {
    logger.error('Error getting region children', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/v1/maps/regions/:region_id/path
 * 获取从根到指定地区的完整路径
 */
router.get('/regions/:region_id/path', (req, res) => {
  try {
    const { region_id } = req.params;

    const path = countryMapSystem.getPath(region_id);

    res.json({
      success: true,
      path: path.map(p => ({
        id: p.id,
        name: p.name,
        name_en: p.nameEn,
        type: p.type,
        coordinates: p.coordinates,
        zoom: p.zoom,
      })),
    });
  } catch (error) {
    logger.error('Error getting region path', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/v1/maps/search
 * 搜索地区
 */
router.get('/search', (req, res) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Query parameter "q" is required',
      });
    }

    const results = countryMapSystem.searchRegions(q);

    res.json({
      success: true,
      results: results.map(r => ({
        id: r.id,
        name: r.name,
        name_en: r.nameEn,
        type: r.type,
        coordinates: r.coordinates,
        parent_id: r.parentId,
        description: r.description,
      })),
      count: results.length,
    });
  } catch (error) {
    logger.error('Error searching regions', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/v1/maps/cities
 * 获取所有城市列表
 */
router.get('/cities', (req, res) => {
  try {
    const cities = countryMapSystem.getCities();

    res.json({
      success: true,
      cities: cities.map(c => ({
        id: c.id,
        name: c.name,
        name_en: c.nameEn,
        coordinates: c.coordinates,
        zoom: c.zoom,
        parent_id: c.parentId,
        description: c.description,
      })),
    });
  } catch (error) {
    logger.error('Error getting cities', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/v1/map/view
 * 获取指定地区的地图视图配置
 */
router.get('/view', (req, res) => {
  try {
    const { region_id } = req.query;

    if (!region_id || typeof region_id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'region_id parameter is required',
      });
    }

    const mapView = countryMapSystem.getMapView(region_id);

    if (!mapView) {
      return res.status(404).json({
        success: false,
        error: 'Region not found',
      });
    }

    res.json({
      success: true,
      view: mapView,
    });
  } catch (error) {
    logger.error('Error getting map view', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/v1/map/regions/:region_id/landmarks
 * 获取指定地区的3D地标建筑配置
 */
router.get('/regions/:region_id/landmarks', (req, res) => {
  try {
    const { region_id } = req.params;
    const allLandmarks: any[] = [];

    // 递归收集所有village级别的地标
    const collectLandmarks = (currentRegionId: string) => {
      // 首先检查当前区域本身是否是地标级别
      const currentRegion = countryMapSystem.getRegion(currentRegionId);
      if (!currentRegion) return;

      if (currentRegion.type === 'village') {
        // 当前区域就是地标，添加到列表
        const index = allLandmarks.length;
        const angle = (index / Math.max(allLandmarks.length + 1, 12)) * Math.PI * 2;
        const radius = 50 + Math.random() * 50;

        allLandmarks.push({
          id: currentRegion.id,
          name: currentRegion.name,
          type: 'landmark',
          x: Math.cos(angle) * radius,
          y: 0,
          z: Math.sin(angle) * radius,
          width: 20 + Math.random() * 30,
          depth: 20 + Math.random() * 30,
          height: 15 + Math.random() * 50,
          color: getLandmarkColor(currentRegion.id),
          realCoordinates: currentRegion.coordinates,
          description: currentRegion.description,
        });
      }

      // 然后递归处理子节点
      if (currentRegion.children && currentRegion.children.length > 0) {
        currentRegion.children.forEach(childId => collectLandmarks(childId));
      }
    };

    collectLandmarks(region_id);

    // 如果没有找到地标，返回一些默认的建筑
    if (allLandmarks.length === 0) {
      const region = countryMapSystem.getRegion(region_id);
      if (region && region.type === 'city') {
        // 为城市添加一些默认建筑
        for (let i = 0; i < 5; i++) {
          const angle = (i / 5) * Math.PI * 2;
          allLandmarks.push({
            id: `${region_id}_building_${i}`,
            name: `${region.name}建筑${i + 1}`,
            type: 'building',
            x: Math.cos(angle) * 60,
            y: 0,
            z: Math.sin(angle) * 60,
            width: 30 + Math.random() * 20,
            depth: 30 + Math.random() * 20,
            height: 30 + Math.random() * 40,
            color: '#a78bfa',
            realCoordinates: region.coordinates,
            description: `默认建筑`,
          });
        }
      }
    }

    res.json({
      success: true,
      landmarks: allLandmarks,
      region_id,
    });
  } catch (error) {
    logger.error('Error getting region landmarks', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * 根据地标ID获取颜色
 */
function getLandmarkColor(landmarkId: string): string {
  const colorMap: Record<string, string> = {
    // 北京地标颜色
    tiananmen: '#ef4444',
    forbidden_city: '#f59e0b',
    cbd: '#3b82f6',
    olympic_park: '#22c55e',
    summer_palace: '#10b981',
    zhongguancun: '#8b5cf6',

    // 上海地标颜色
    lujiazui: '#8b5cf6',
    shanghai_disney: '#f472b6',
    the_bund: '#f59e0b',
    nanjing_road: '#ec4899',

    // 广州地标颜色
    canton_tower: '#ef4444',
    gz_cbd: '#3b82f6',

    // 深圳地标颜色
    sz_cbd: '#3b82f6',
    shenzhen_high_tech: '#8b5cf6',

    // 杭州地标颜色
    west_lake: '#06b6d4',
    ali_park: '#f97316',

    // 成都地标颜色
    chunxi_road: '#ec4899',
    tianfu_square: '#f59e0b',
    dufu_thatched: '#22c55e',

    // 西安地标颜色
    bell_tower: '#f59e0b',
    big_wild_goose: '#ef4444',
    city_wall: '#9ca3af',
  };

  return colorMap[landmarkId] || '#a78bfa';
}

/**
 * GET /api/v1/map/cities/:city_id/geography
 * 获取城市的完整3D地理数据（道路、地标、河流）
 */
router.get('/cities/:city_id/geography', async (req, res) => {
  try {
    const { city_id } = req.params;

    logger.info(`Fetching 3D geography for city: ${city_id}`);

    // 获取城市地理数据
    const cityData = cityGeographySystem.getCityData(city_id);

    if (!cityData) {
      return res.status(404).json({
        success: false,
        error: 'City not found',
      });
    }

    // 生成道路数据
    const roadPaths: any[] = [];
    for (const roadDef of cityData.roads) {
      try {
        const path = await generateRoadPathFromRealCoords(roadDef, cityData.center);
        roadPaths.push({
          id: roadDef.id,
          name: roadDef.name,
          nameEn: roadDef.nameEn,
          type: roadDef.type,
          width: roadDef.width,
          lanes: roadDef.lanes,
          speedLimit: roadDef.speedLimit,
          path,
        });
      } catch (error) {
        logger.error(`Failed to generate path for road ${roadDef.id}:`, error);
      }
    }

    // 转换地标为3D坐标，并偏移以避免与道路重叠
    const landmarks3D = cityData.landmarks.map(lm => {
      const virtual = mapCoordinateSystem.realToVirtual(
        lm.realCoordinates.lat,
        lm.realCoordinates.lng
      );

      // 检查地标是否与道路重叠，如果重叠则偏移
      let adjustedX = virtual.x;
      let adjustedZ = virtual.z;
      const landmarkWidth = lm.width / 10;
      const landmarkDepth = lm.depth / 10;
      const minDistance = (landmarkWidth + landmarkDepth) / 2 + 5; // 最小安全距离

      for (const road of roadPaths) {
        for (const point of road.path) {
          const dx = adjustedX - point.x;
          const dz = adjustedZ - point.z;
          const distance = Math.sqrt(dx * dx + dz * dz);

          if (distance < minDistance) {
            // 计算偏移方向（垂直于道路方向）
            let offsetX = dx;
            let offsetZ = dz;
            const length = Math.sqrt(offsetX * offsetX + offsetZ * offsetZ);

            if (length > 0.01) {
              offsetX /= length;
              offsetZ /= length;
              // 偏移到安全距离
              adjustedX += offsetX * (minDistance - distance + 2);
              adjustedZ += offsetZ * (minDistance - distance + 2);
            }
          }
        }
      }

      return {
        id: lm.id,
        name: lm.name,
        nameEn: lm.nameEn,
        type: lm.type,
        x: adjustedX,
        y: virtual.y,
        z: adjustedZ,
        width: lm.width / 10,  // 转换为虚拟空间单位
        depth: lm.depth / 10,
        height: lm.height / 10,
        color: lm.color,
        description: lm.description,
        realCoordinates: lm.realCoordinates,
      };
    });

    // 转换河流为3D坐标
    const rivers3D = cityData.rivers.map(river => {
      const path3D = river.path.map(coord => {
        const virtual = mapCoordinateSystem.realToVirtual(coord.lat, coord.lng);
        return {
          x: virtual.x,
          y: virtual.y - 1,  // 河流稍微低于地面
          z: virtual.z,
        };
      });

      return {
        id: river.id,
        name: river.name,
        nameEn: river.nameEn,
        path: path3D,
        width: river.width / 10,
      };
    });

    // 计算城市中心点（虚拟坐标）用于居中
    const cityCenterVirtual = mapCoordinateSystem.realToVirtual(
      cityData.center.lat,
      cityData.center.lng
    );

    // 将所有坐标居中到 (0, 0, 0)
    const centerRoads = roadPaths.map(road => ({
      ...road,
      path: road.path.map(point => ({
        x: point.x - cityCenterVirtual.x,
        y: point.y,
        z: point.z - cityCenterVirtual.z,
      })),
    }));

    const centerLandmarks = landmarks3D.map(lm => ({
      ...lm,
      x: lm.x - cityCenterVirtual.x,
      z: lm.z - cityCenterVirtual.z,
    }));

    const centerRivers = cityData.rivers.map(river => {
      const path3D = river.path.map(coord => {
        const virtual = mapCoordinateSystem.realToVirtual(coord.lat, coord.lng);
        return {
          x: virtual.x - cityCenterVirtual.x,
          y: virtual.y - 1,
          z: virtual.z - cityCenterVirtual.z,
        };
      });

      return {
        id: river.id,
        name: river.name,
        nameEn: river.nameEn,
        path: path3D,
        width: river.width / 10,
      };
    });

    // 计算城市边界
    const bounds = cityData.bounds;
    const minVirtual = mapCoordinateSystem.realToVirtual(bounds.minLat, bounds.minLng);
    const maxVirtual = mapCoordinateSystem.realToVirtual(bounds.maxLat, bounds.maxLng);

    // 居中边界
    const centeredBounds = {
      min: {
        x: minVirtual.x - cityCenterVirtual.x,
        y: minVirtual.y,
        z: minVirtual.z - cityCenterVirtual.z,
      },
      max: {
        x: maxVirtual.x - cityCenterVirtual.x,
        y: maxVirtual.y,
        z: maxVirtual.z - cityCenterVirtual.z,
      },
    };

    res.json({
      success: true,
      city: {
        id: cityData.cityId,
        name: cityData.cityName,
        center: { lat: 0, lng: 0 }, // 虚拟空间中，城市中心在原点
        realCenter: cityData.center, // 保存真实坐标供参考
      },
      bounds: centeredBounds,
      roads: centerRoads,
      landmarks: centerLandmarks,
      rivers: centerRivers,
    });
  } catch (error) {
    logger.error('Error getting city geography:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * 根据真实坐标生成道路路径
 */
async function generateRoadPathFromRealCoords(
  roadDef: any,
  cityCenter: { lat: number; lng: number }
): Promise<any[]> {
  const path: any[] = [];
  const { start, end } = roadDef.realCoordinates;

  // 检查是否是环路（通过包围盒）
  if (roadDef.type === 'ring_road') {
    return generateRingPath(start, end);
  } else {
    return generateLinearPath(start, end);
  }
}

/**
 * 生成环形路径
 */
function generateRingPath(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number }
): any[] {
  const path: any[] = [];
  const segments = 64;

  // 计算椭圆参数
  const minLat = Math.min(start.lat, end.lat);
  const maxLat = Math.max(start.lat, end.lat);
  const minLng = Math.min(start.lng, end.lng);
  const maxLng = Math.max(start.lng, end.lng);

  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;

  const center = mapCoordinateSystem.realToVirtual(centerLat, centerLng);
  const topLeft = mapCoordinateSystem.realToVirtual(maxLat, minLng);
  const topRight = mapCoordinateSystem.realToVirtual(maxLat, maxLng);
  const bottomLeft = mapCoordinateSystem.realToVirtual(minLat, minLng);
  const bottomRight = mapCoordinateSystem.realToVirtual(minLat, maxLng);

  const radiusX = Math.max(
    Math.abs(topRight.x - topLeft.x) / 2,
    Math.abs(bottomRight.x - bottomLeft.x) / 2
  );
  const radiusZ = Math.max(
    Math.abs(topLeft.z - bottomLeft.z) / 2,
    Math.abs(topRight.z - bottomRight.z) / 2
  );

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    path.push({
      x: center.x + Math.cos(angle) * radiusX,
      y: 0,
      z: center.z + Math.sin(angle) * radiusZ,
    });
  }

  return path;
}

/**
 * 生成线性路径
 */
function generateLinearPath(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number }
): any[] {
  const path: any[] = [];
  const steps = 30;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lat = start.lat + (end.lat - start.lat) * t;
    const lng = start.lng + (end.lng - start.lng) * t;
    const virtual = mapCoordinateSystem.realToVirtual(lat, lng);
    path.push(virtual);
  }

  return path;
}

export default router;
