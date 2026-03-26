/**
 * 城市级地形加载 API
 * 根据 Agent 所在城市加载对应的地形数据
 */

import { createLogger } from '../../utils/logger';
import { cityTerrainSystem } from '../../core/CityTerrainSystem';
import { getAllCities, getCityConfig } from '../../config/cities';
import { mapCoordinateSystem } from '../../core/MapCoordinateSystem';

const logger = createLogger('CityTerrainAPI');

/**
 * 获取所有城市列表
 */
export async function getCities(_req: any, res: any) {
  try {
    const cities = getAllCities();

    const formatted = cities.map(city => ({
      id: city.id,
      name: city.name,
      name_en: city.nameEn,
      country: city.country,
      province: city.province,
      center: city.center,
    }));

    return res.json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    logger.error('Failed to get cities:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get cities',
    });
  }
}

/**
 * 获取城市详情
 */
export async function getCityDetail(req: any, res: any) {
  try {
    const { cityId } = req.params;
    const city = getCityConfig(cityId);

    if (!city) {
      return res.status(404).json({
        success: false,
        error: 'City not found',
      });
    }

    return res.json({
      success: true,
      data: city,
    });
  } catch (error) {
    logger.error('Failed to get city detail:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get city detail',
    });
  }
}

/**
 * 根据 Agent ID 获取城市地形数据
 */
export async function getTerrainByAgent(req: any, res: any) {
  try {
    const { agentId } = req.params;

    if (!agentId) {
      return res.status(400).json({
        success: false,
        error: 'Agent ID is required',
      });
    }

    const terrainData = await cityTerrainSystem.getTerrainByAgentId(agentId);

    // 获取城市配置以计算中心点偏移
    const city = terrainData.city ? getCityConfig(terrainData.city.id) : null;
    let centerOffset = { x: 0, z: 0 };

    if (city && city.center) {
      // 计算城市中心在虚拟坐标系中的位置
      centerOffset = mapCoordinateSystem.realToVirtual(city.center.lat, city.center.lng);
    }

    // 居中地形特征位置
    const centerPosition = (pos: { x: number; y: number; z: number }) => ({
      x: pos.x - centerOffset.x,
      y: pos.y,
      z: pos.z - centerOffset.z,
    });

    return res.json({
      success: true,
      data: {
        city: terrainData.city,
        mountains: terrainData.mountains.map(f => ({
          ...formatTerrainFeature(f),
          position: centerPosition(f.position),
        })),
        hills: terrainData.hills.map(f => ({
          ...formatTerrainFeature(f),
          position: centerPosition(f.position),
        })),
        rivers: terrainData.rivers.map(f => {
          const formatted = formatTerrainFeature(f);
          // 对于河流，需要居中路径中的每个点
          const metadata = formatted.metadata as any;
          if (metadata?.path && Array.isArray(metadata.path)) {
            metadata.path = metadata.path.map((p: any) => ({
              x: p.x - centerOffset.x,
              y: p.y,
              z: p.z - centerOffset.z,
            }));
          }
          // 同时居中河流的position
          formatted.position = centerPosition(formatted.position);
          return formatted;
        }),
        plains: terrainData.plains.map(f => ({
          ...formatTerrainFeature(f),
          position: centerPosition(f.position),
        })),
        waters: terrainData.waters.map(f => ({
          ...formatTerrainFeature(f),
          position: centerPosition(f.position),
        })),
      },
    });
  } catch (error) {
    logger.error('Failed to get terrain by agent:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get terrain data',
    });
  }
}

/**
 * 根据城市名称获取地形数据
 */
export async function getTerrainByCity(req: any, res: any) {
  try {
    const { cityId } = req.params;
    const terrainData = await cityTerrainSystem.getTerrainByCityName(cityId);

    // 获取城市配置以计算中心点偏移
    const city = terrainData.city ? getCityConfig(terrainData.city.id) : null;
    let centerOffset = { x: 0, z: 0 };

    if (city && city.center) {
      centerOffset = mapCoordinateSystem.realToVirtual(city.center.lat, city.center.lng);
    }

    const centerPosition = (pos: { x: number; y: number; z: number }) => ({
      x: pos.x - centerOffset.x,
      y: pos.y,
      z: pos.z - centerOffset.z,
    });

    return res.json({
      success: true,
      data: {
        city: terrainData.city,
        mountains: terrainData.mountains.map(f => ({
          ...formatTerrainFeature(f),
          position: centerPosition(f.position),
        })),
        hills: terrainData.hills.map(f => ({
          ...formatTerrainFeature(f),
          position: centerPosition(f.position),
        })),
        rivers: terrainData.rivers.map(f => {
          const formatted = formatTerrainFeature(f);
          const metadata = formatted.metadata as any;
          if (metadata?.path && Array.isArray(metadata.path)) {
            metadata.path = metadata.path.map((p: any) => ({
              x: p.x - centerOffset.x,
              y: p.y,
              z: p.z - centerOffset.z,
            }));
          }
          formatted.position = centerPosition(formatted.position);
          return formatted;
        }),
        plains: terrainData.plains.map(f => ({
          ...formatTerrainFeature(f),
          position: centerPosition(f.position),
        })),
        waters: terrainData.waters.map(f => ({
          ...formatTerrainFeature(f),
          position: centerPosition(f.position),
        })),
      },
    });
  } catch (error) {
    logger.error('Failed to get terrain by city:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get terrain data',
    });
  }
}

/**
 * 根据经纬度获取地形数据
 */
export async function getTerrainByCoordinates(req: any, res: any) {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required',
      });
    }

    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lng as string);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid coordinates',
      });
    }

    const terrainData = await cityTerrainSystem.getTerrainByCoordinates(latitude, longitude);

    return res.json({
      success: true,
      data: {
        city: terrainData.city,
        mountains: terrainData.mountains.map(f => formatTerrainFeature(f)),
        hills: terrainData.hills.map(f => formatTerrainFeature(f)),
        rivers: terrainData.rivers.map(f => formatTerrainFeature(f)),
        plains: terrainData.plains.map(f => formatTerrainFeature(f)),
        waters: terrainData.waters.map(f => formatTerrainFeature(f)),
      },
    });
  } catch (error) {
    logger.error('Failed to get terrain by coordinates:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get terrain data',
    });
  }
}

/**
 * 清除地形缓存
 */
export async function clearTerrainCache(_req: any, res: any) {
  try {
    cityTerrainSystem.clearCache();

    return res.json({
      success: true,
      message: 'Terrain cache cleared',
    });
  } catch (error) {
    logger.error('Failed to clear terrain cache:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
    });
  }
}

/**
 * 强制重新生成城市地形
 */
export async function regenerateTerrain(req: any, res: any) {
  try {
    const { cityId } = req.params;

    if (!cityId) {
      return res.status(400).json({
        success: false,
        error: 'City ID is required',
      });
    }

    const terrainData = await cityTerrainSystem.regenerateTerrain(cityId);

    // 获取城市配置以计算中心点偏移
    const city = getCityConfig(cityId);
    let centerOffset = { x: 0, z: 0 };

    if (city && city.center) {
      centerOffset = mapCoordinateSystem.realToVirtual(city.center.lat, city.center.lng);
    }

    const centerPosition = (pos: { x: number; y: number; z: number }) => ({
      x: pos.x - centerOffset.x,
      y: pos.y,
      z: pos.z - centerOffset.z,
    });

    return res.json({
      success: true,
      data: {
        city: terrainData.city,
        mountains: terrainData.mountains.map(f => ({
          ...formatTerrainFeature(f),
          position: centerPosition(f.position),
        })),
        hills: terrainData.hills.map(f => ({
          ...formatTerrainFeature(f),
          position: centerPosition(f.position),
        })),
        rivers: terrainData.rivers.map(f => {
          const formatted = formatTerrainFeature(f);
          const metadata = formatted.metadata as any;
          if (metadata?.path && Array.isArray(metadata.path)) {
            metadata.path = metadata.path.map((p: any) => ({
              x: p.x - centerOffset.x,
              y: p.y,
              z: p.z - centerOffset.z,
            }));
          }
          formatted.position = centerPosition(formatted.position);
          return formatted;
        }),
        plains: terrainData.plains.map(f => ({
          ...formatTerrainFeature(f),
          position: centerPosition(f.position),
        })),
        waters: terrainData.waters.map(f => ({
          ...formatTerrainFeature(f),
          position: centerPosition(f.position),
        })),
      },
      message: `Terrain regenerated for ${cityId}`,
    });
  } catch (error) {
    logger.error('Failed to regenerate terrain:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to regenerate terrain',
    });
  }
}

/**
 * 格式化地形特征数据
 */
function formatTerrainFeature(feature: any) {
  return {
    id: feature.id,
    feature_id: feature.feature_id,
    type: feature.type,
    name: feature.name,
    position: feature.position,
    size: feature.size,
    real_coordinates: feature.realCoordinates,
    metadata: feature.metadata,
  };
}
