// 地形相关 API

import { createLogger } from '../../utils/logger';
import { terrainSystem } from '../../core/TerrainSystem';
import { roadNetwork } from '../../core/RoadNetwork';
import { vehicleSystem } from '../../core/VehicleSystem';
import { vehicleService } from '../../services/vehicleService';

const logger = createLogger('TerrainAPI');

/**
 * 获取所有地形特征
 */
export async function getTerrainFeatures(req: Request, res: any) {
  try {
    const features = terrainSystem.getAllFeatures();

    const formatted = features.map(feature => ({
      id: feature.id,
      feature_id: feature.feature_id,
      type: feature.type,
      name: feature.name,
      position: feature.position,
      size: feature.size,
      real_coordinates: feature.realCoordinates,
      metadata: feature.metadata,
    }));

    return res.json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    logger.error('Failed to get terrain features:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get terrain features',
    });
  }
}

/**
 * 按类型获取地形特征
 */
export async function getTerrainByType(req: Request, res: any) {
  try {
    const { type } = req.params;
    const features = terrainSystem.getFeaturesByType(type as any);

    const formatted = features.map(feature => ({
      id: feature.id,
      feature_id: feature.feature_id,
      type: feature.type,
      name: feature.name,
      position: feature.position,
      size: feature.size,
      real_coordinates: feature.realCoordinates,
      metadata: feature.metadata,
    }));

    return res.json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    logger.error('Failed to get terrain by type:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get terrain features',
    });
  }
}

/**
 * 获取道路网络
 */
export async function getRoadNetwork(req: Request, res: any) {
  try {
    const renderData = roadNetwork.getRenderData();

    const roads = renderData.roads.map(road => ({
      road_id: road.road_id,
      name: road.name,
      name_en: road.nameEn,
      type: road.type,
      width: road.width,
      lanes: road.lanes,
      speed_limit: road.speedLimit,
      path: road.path,
      has_lane_markings: road.hasLaneMarkings,
    }));

    const intersections = renderData.intersections.map(intersection => ({
      id: intersection.id,
      position: intersection.position,
      roads: intersection.roads,
      is_traffic_controlled: intersection.isTrafficControlled,
    }));

    return res.json({
      success: true,
      data: {
        roads,
        intersections,
      },
    });
  } catch (error) {
    logger.error('Failed to get road network:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get road network',
    });
  }
}

/**
 * 获取所有道路
 */
export async function getRoads(req: Request, res: any) {
  try {
    const roads = roadNetwork.getAllRoads();

    const formatted = roads.map(road => ({
      road_id: road.road_id,
      name: road.name,
      name_en: road.nameEn,
      type: road.type,
      width: road.width,
      lanes: road.lanes,
      speed_limit: road.speedLimit,
      path: road.path,
      has_lane_markings: road.hasLaneMarkings,
    }));

    return res.json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    logger.error('Failed to get roads:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get roads',
    });
  }
}

/**
 * 获取所有车辆
 */
export async function getVehicles(req: Request, res: any) {
  try {
    const vehicles = await vehicleService.getAllVehicles();

    const formatted = vehicles.map(vehicle => ({
      vehicle_id: vehicle.vehicle_id,
      name: vehicle.name,
      type: vehicle.type,
      position: vehicle.position,
      rotation: vehicle.rotation,
      speed: vehicle.speed,
      capacity: vehicle.capacity,
      max_speed: vehicle.maxSpeed,
      color: vehicle.color,
      status: vehicle.status,
      current_driver_id: vehicle.currentDriverId,
    }));

    return res.json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    logger.error('Failed to get vehicles:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get vehicles',
    });
  }
}

/**
 * 获取车辆详情
 */
export async function getVehicle(req: Request, res: any) {
  try {
    const { vehicleId } = req.params;
    const vehicle = await vehicleService.getVehicle(vehicleId);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: 'Vehicle not found',
      });
    }

    return res.json({
      success: true,
      data: vehicle,
    });
  } catch (error) {
    logger.error('Failed to get vehicle:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get vehicle',
    });
  }
}

/**
 * 创建车辆
 */
export async function createVehicle(req: Request, res: any) {
  try {
    const { name, type, color, position, ownerId } = req.body;

    const vehicle = await vehicleService.createVehicle({
      name,
      type,
      color,
      position,
      ownerId,
    });

    if (!vehicle) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create vehicle',
      });
    }

    return res.json({
      success: true,
      data: vehicle,
    });
  } catch (error) {
    logger.error('Failed to create vehicle:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create vehicle',
    });
  }
}

/**
 * 获取地形渲染数据
 */
export async function getTerrainRenderData(req: Request, res: any) {
  try {
    const renderData = terrainSystem.getRenderData();

    const formatted = {
      mountains: renderData.mountains.map(f => ({
        id: f.id,
        feature_id: f.feature_id,
        type: f.type,
        name: f.name,
        position: f.position,
        size: f.size,
        metadata: f.metadata,
      })),
      hills: renderData.hills.map(f => ({
        id: f.id,
        feature_id: f.feature_id,
        type: f.type,
        name: f.name,
        position: f.position,
        size: f.size,
        metadata: f.metadata,
      })),
      rivers: renderData.rivers.map(f => ({
        id: f.id,
        feature_id: f.feature_id,
        type: f.type,
        name: f.name,
        position: f.position,
        size: f.size,
        metadata: f.metadata,
      })),
      plains: renderData.plains.map(f => ({
        id: f.id,
        feature_id: f.feature_id,
        type: f.type,
        name: f.name,
        position: f.position,
        size: f.size,
        metadata: f.metadata,
      })),
    };

    return res.json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    logger.error('Failed to get terrain render data:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get terrain render data',
    });
  }
}
