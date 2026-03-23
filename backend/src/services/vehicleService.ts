// 车辆业务逻辑服务

import { createLogger } from '../utils/logger';
import { getDatabase } from './database';
import { vehicleSystem } from '../core/VehicleSystem';
import { mapCoordinateSystem } from '../core/MapCoordinateSystem';
import { roadNetwork } from '../core/RoadNetwork';
import {
  VehicleConfig,
  VehicleState,
  Vector3D,
  VehicleType,
  VehicleInteractionType,
} from '../types/vehicle';

const logger = createLogger('VehicleService');

/**
 * 创建车辆请求
 */
export interface CreateVehicleRequest {
  name: string;
  type: VehicleType;
  color: string;
  position?: Vector3D;
  ownerId?: string;
}

/**
 * 更新车辆位置请求
 */
export interface UpdateVehiclePositionRequest {
  vehicleId: string;
  position: Vector3D;
  rotation: number;
  speed: number;
}

/**
 * 车辆导航请求
 */
export interface VehicleNavigationRequest {
  vehicleId: string;
  destination: Vector3D;
  avoidHighways?: boolean;
}

/**
 * 车辆服务类
 */
export class VehicleService {
  /**
   * 创建新车辆
   */
  async createVehicle(request: CreateVehicleRequest): Promise<VehicleConfig | null> {
    try {
      logger.info(`Creating vehicle: ${request.name}`);

      // 如果未指定位置，使用默认生成位置
      let position = request.position;
      if (!position) {
        position = this.generateSpawnPosition();
      }

      const vehicle = await vehicleSystem.createVehicle({
        type: request.type,
        color: request.color,
        name: request.name,
        position,
        ownerId: request.ownerId,
      });

      if (vehicle) {
        logger.info(`Vehicle created successfully: ${vehicle.vehicle_id}`);
        return vehicle;
      }

      return null;
    } catch (error) {
      logger.error('Failed to create vehicle:', error);
      return null;
    }
  }

  /**
   * 获取车辆信息
   */
  async getVehicle(vehicleId: string): Promise<VehicleConfig | null> {
    try {
      const db = getDatabase();
      const vehicle = await db.vehicle.findUnique({
        where: { vehicle_id: vehicleId },
      });

      if (!vehicle) {
        return null;
      }

      return {
        vehicle_id: vehicle.vehicle_id,
        name: vehicle.name,
        type: vehicle.type as VehicleType,
        position: vehicle.position as Vector3D,
        rotation: vehicle.rotation,
        speed: vehicle.speed,
        capacity: vehicle.capacity,
        maxSpeed: vehicle.max_speed,
        color: vehicle.color,
        status: vehicle.status as any,
        currentDriverId: vehicle.current_driver_id || undefined,
        currentLocationId: vehicle.current_location_id,
        ownerId: vehicle.owner_agent_id || undefined,
      };
    } catch (error) {
      logger.error(`Failed to get vehicle ${vehicleId}:`, error);
      return null;
    }
  }

  /**
   * 获取所有车辆
   */
  async getAllVehicles(): Promise<VehicleConfig[]> {
    try {
      const db = getDatabase();
      const vehicles = await db.vehicle.findMany();

      return vehicles.map(vehicle => ({
        vehicle_id: vehicle.vehicle_id,
        name: vehicle.name,
        type: vehicle.type as VehicleType,
        position: vehicle.position as Vector3D,
        rotation: vehicle.rotation,
        speed: vehicle.speed,
        capacity: vehicle.capacity,
        maxSpeed: vehicle.max_speed,
        color: vehicle.color,
        status: vehicle.status as any,
        currentDriverId: vehicle.current_driver_id || undefined,
        currentLocationId: vehicle.current_location_id,
        ownerId: vehicle.owner_agent_id || undefined,
      }));
    } catch (error) {
      logger.error('Failed to get all vehicles:', error);
      return [];
    }
  }

  /**
   * 获取Agent拥有的车辆
   */
  async getAgentVehicles(agentId: string): Promise<VehicleConfig[]> {
    try {
      const db = getDatabase();
      const vehicles = await db.vehicle.findMany({
        where: { owner_agent_id: agentId },
      });

      return vehicles.map(vehicle => ({
        vehicle_id: vehicle.vehicle_id,
        name: vehicle.name,
        type: vehicle.type as VehicleType,
        position: vehicle.position as Vector3D,
        rotation: vehicle.rotation,
        speed: vehicle.speed,
        capacity: vehicle.capacity,
        maxSpeed: vehicle.max_speed,
        color: vehicle.color,
        status: vehicle.status as any,
        currentDriverId: vehicle.current_driver_id || undefined,
        currentLocationId: vehicle.current_location_id,
        ownerId: vehicle.owner_agent_id || undefined,
      }));
    } catch (error) {
      logger.error(`Failed to get vehicles for agent ${agentId}:`, error);
      return [];
    }
  }

  /**
   * 更新车辆位置
   */
  async updateVehiclePosition(request: UpdateVehiclePositionRequest): Promise<boolean> {
    try {
      const db = getDatabase();
      await db.vehicle.update({
        where: { vehicle_id: request.vehicleId },
        data: {
          position: { x: request.position.x, y: request.position.y, z: request.position.z },
          rotation: request.rotation,
          speed: request.speed,
        },
      });

      // 更新内存中的车辆
      const vehicle = vehicleSystem.getVehicle(request.vehicleId);
      if (vehicle) {
        vehicle.position = request.position;
        vehicle.rotation = request.rotation;
        vehicle.speed = request.speed;
      }

      return true;
    } catch (error) {
      logger.error(`Failed to update vehicle position:`, error);
      return false;
    }
  }

  /**
   * Agent进入车辆
   */
  async enterVehicle(agentId: string, vehicleId: string): Promise<{ success: boolean; message?: string }> {
    try {
      const vehicle = await this.getVehicle(vehicleId);
      if (!vehicle) {
        return { success: false, message: 'Vehicle not found' };
      }

      if (vehicle.currentDriverId) {
        return { success: false, message: 'Vehicle already has a driver' };
      }

      const success = await vehicleSystem.enterVehicle(agentId, vehicleId);
      return { success };
    } catch (error) {
      logger.error(`Failed to enter vehicle:`, error);
      return { success: false, message: 'Internal error' };
    }
  }

  /**
   * Agent离开车辆
   */
  async exitVehicle(agentId: string, vehicleId: string): Promise<{ success: boolean; message?: string }> {
    try {
      const vehicle = await this.getVehicle(vehicleId);
      if (!vehicle) {
        return { success: false, message: 'Vehicle not found' };
      }

      if (vehicle.currentDriverId !== agentId) {
        return { success: false, message: 'Agent is not driving this vehicle' };
      }

      const success = await vehicleSystem.exitVehicle(agentId, vehicleId);
      return { success };
    } catch (error) {
      logger.error(`Failed to exit vehicle:`, error);
      return { success: false, message: 'Internal error' };
    }
  }

  /**
   * 驾驶车辆
   */
  async driveVehicle(
    agentId: string,
    vehicleId: string,
    action: 'accelerate' | 'decelerate' | 'turnLeft' | 'turnRight' | 'brake' | 'stop',
    intensity?: number
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const success = await vehicleSystem.driveVehicle(agentId, vehicleId, {
        action,
        intensity,
      });
      return { success };
    } catch (error) {
      logger.error(`Failed to drive vehicle:`, error);
      return { success: false, message: 'Internal error' };
    }
  }

  /**
   * 车辆导航
   */
  async navigateVehicle(request: VehicleNavigationRequest): Promise<Vector3D[] | null> {
    try {
      const vehicle = await this.getVehicle(request.vehicleId);
      if (!vehicle) {
        return null;
      }

      // 使用道路网络进行路径规划
      const route = await roadNetwork.findPath({
        start: vehicle.position,
        end: request.destination,
        avoidHighways: request.avoidHighways,
      });

      if (!route) {
        return null;
      }

      return route.waypoints;
    } catch (error) {
      logger.error(`Failed to navigate vehicle:`, error);
      return null;
    }
  }

  /**
   * 获取附近的车辆
   */
  async getNearbyVehicles(position: Vector3D, radius: number): Promise<VehicleConfig[]> {
    try {
      const vehicles = await this.getAllVehicles();
      const nearby: VehicleConfig[] = [];

      for (const vehicle of vehicles) {
        const dist = Math.sqrt(
          Math.pow(vehicle.position.x - position.x, 2) +
          Math.pow(vehicle.position.z - position.z, 2)
        );

        if (dist <= radius) {
          nearby.push(vehicle);
        }
      }

      return nearby.sort((a, b) => {
        const distA = Math.sqrt(
          Math.pow(a.position.x - position.x, 2) +
          Math.pow(a.position.z - position.z, 2)
        );
        const distB = Math.sqrt(
          Math.pow(b.position.x - position.x, 2) +
          Math.pow(b.position.z - position.z, 2)
        );
        return distA - distB;
      });
    } catch (error) {
      logger.error('Failed to get nearby vehicles:', error);
      return [];
    }
  }

  /**
   * 删除车辆
   */
  async deleteVehicle(vehicleId: string): Promise<boolean> {
    try {
      const db = getDatabase();
      await db.vehicleInteraction.deleteMany({
        where: { vehicle_id: vehicleId },
      });
      await db.vehicleState.delete({
        where: { vehicle_id: vehicleId },
      });
      await db.vehicle.delete({
        where: { vehicle_id: vehicleId },
      });

      logger.info(`Vehicle deleted: ${vehicleId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete vehicle ${vehicleId}:`, error);
      return false;
    }
  }

  /**
   * 获取车辆状态
   */
  async getVehicleState(vehicleId: string): Promise<VehicleState | null> {
    try {
      const db = getDatabase();
      const state = await db.vehicleState.findUnique({
        where: { vehicle_id: vehicleId },
      });

      if (!state) {
        return null;
      }

      return {
        vehicle_id: state.vehicle_id,
        position: state.position as Vector3D,
        rotation: 0,
        speed: 0,
        acceleration: state.acceleration,
        steering_angle: state.steering_angle,
        fuel: state.fuel,
        health: state.health,
        lastUpdated: state.updated_at,
      };
    } catch (error) {
      logger.error(`Failed to get vehicle state for ${vehicleId}:`, error);
      return null;
    }
  }

  /**
   * 获取车辆交互历史
   */
  async getVehicleInteractions(vehicleId: string, limit: number = 50): Promise<any[]> {
    try {
      const db = getDatabase();
      const interactions = await db.vehicleInteraction.findMany({
        where: { vehicle_id: vehicleId },
        orderBy: { timestamp: 'desc' },
        take: limit,
      });

      return interactions;
    } catch (error) {
      logger.error(`Failed to get vehicle interactions for ${vehicleId}:`, error);
      return [];
    }
  }

  /**
   * 生成车辆生成位置
   */
  private generateSpawnPosition(): Vector3D {
    // 在主要道路旁生成车辆
    const spawnPositions = [
      { x: 0, y: 0, z: 30 },
      { x: 30, y: 0, z: 0 },
      { x: -30, y: 0, z: 0 },
      { x: 0, y: 0, z: -30 },
      { x: 50, y: 0, z: 50 },
      { x: -50, y: 0, z: 50 },
      { x: 50, y: 0, z: -50 },
      { x: -50, y: 0, z: -50 },
    ];

    return spawnPositions[Math.floor(Math.random() * spawnPositions.length)];
  }

  /**
   * 批量创建初始车辆
   */
  async initializeDefaultVehicles(): Promise<void> {
    const defaultVehicles = [
      { type: 'car' as VehicleType, color: '#FF6B6B', name: '红色小轿车' },
      { type: 'car' as VehicleType, color: '#4ECDC4', name: '青色小轿车' },
      { type: 'bus' as VehicleType, color: '#95E1D3', name: '公交车1号' },
      { type: 'taxi' as VehicleType, color: '#FFD93D', name: '出租车1号' },
      { type: 'motorcycle' as VehicleType, color: '#FFE66D', name: '黄色摩托车' },
    ];

    for (const vehicleConfig of defaultVehicles) {
      await this.createVehicle(vehicleConfig);
    }

    logger.info('Default vehicles initialized');
  }
}

// 导出单例
export const vehicleService = new VehicleService();
