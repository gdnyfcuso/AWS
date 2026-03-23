// 车辆管理系统 - 卡通风格车辆与Agent交互

import { createLogger } from '../utils/logger';
import { EventManager } from './EventManager';
import { roadNetwork } from './RoadNetwork';
import { mapCoordinateSystem } from './MapCoordinateSystem';
import {
  VehicleConfig,
  VehicleState,
  VehicleInteractionType,
  VehiclePhysics,
  VehicleSize,
  VehicleTypeDefinition,
  VehicleType,
  Vector3D,
  VehicleEvent,
  DriveCommand,
} from '../types/vehicle';
import { getDatabase } from '../services/database';

const logger = createLogger('VehicleSystem');

/**
 * 车辆类型定义（卡通风格）
 */
const VEHICLE_TYPES: Record<VehicleType, VehicleTypeDefinition> = {
  car: {
    type: 'car',
    name: '小轿车',
    size: { length: 8, width: 4, height: 3 },
    physics: {
      mass: 1500,
      maxAcceleration: 5,
      maxDeceleration: 8,
      maxSteeringAngle: Math.PI / 4,
      friction: 0.02,
      drag: 0.001,
    },
    defaultCapacity: 4,
    defaultMaxSpeed: 100,
    defaultColor: '#FF6B6B',
    modelConfig: {
      bodyShape: 'sedan',
      hasRoof: true,
      wheelPositions: [
        { x: -3, y: -1, z: 2 },
        { x: 3, y: -1, z: 2 },
        { x: -3, y: -1, z: -2 },
        { x: 3, y: -1, z: -2 },
      ],
      windowConfig: { front: true, rear: true, sides: true },
    },
  },
  bus: {
    type: 'bus',
    name: '公交车',
    size: { length: 16, width: 5, height: 5 },
    physics: {
      mass: 8000,
      maxAcceleration: 2,
      maxDeceleration: 4,
      maxSteeringAngle: Math.PI / 6,
      friction: 0.03,
      drag: 0.002,
    },
    defaultCapacity: 30,
    defaultMaxSpeed: 60,
    defaultColor: '#4ECDC4',
    modelConfig: {
      bodyShape: 'box',
      hasRoof: true,
      wheelPositions: [
        { x: -5, y: -1, z: 2 },
        { x: 5, y: -1, z: 2 },
        { x: -5, y: -1, z: -2 },
        { x: 5, y: -1, z: -2 },
      ],
      windowConfig: { front: true, rear: true, sides: true },
    },
  },
  truck: {
    type: 'truck',
    name: '卡车',
    size: { length: 14, width: 5, height: 6 },
    physics: {
      mass: 5000,
      maxAcceleration: 2.5,
      maxDeceleration: 5,
      maxSteeringAngle: Math.PI / 6,
      friction: 0.025,
      drag: 0.0015,
    },
    defaultCapacity: 2,
    defaultMaxSpeed: 80,
    defaultColor: '#95E1D3',
    modelConfig: {
      bodyShape: 'box',
      hasRoof: true,
      wheelPositions: [
        { x: -4, y: -1, z: 2 },
        { x: 4, y: -1, z: 2 },
        { x: -4, y: -1, z: -2 },
        { x: 4, y: -1, z: -2 },
      ],
      windowConfig: { front: true, rear: false, sides: true },
    },
  },
  motorcycle: {
    type: 'motorcycle',
    name: '摩托车',
    size: { length: 4, width: 1.5, height: 2 },
    physics: {
      mass: 200,
      maxAcceleration: 8,
      maxDeceleration: 10,
      maxSteeringAngle: Math.PI / 3,
      friction: 0.015,
      drag: 0.0005,
    },
    defaultCapacity: 2,
    defaultMaxSpeed: 120,
    defaultColor: '#FFE66D',
    modelConfig: {
      bodyShape: 'rounded',
      hasRoof: false,
      wheelPositions: [
        { x: -1.5, y: -0.5, z: 0 },
        { x: 1.5, y: -0.5, z: 0 },
      ],
      windowConfig: { front: false, rear: false, sides: false },
    },
  },
  bicycle: {
    type: 'bicycle',
    name: '自行车',
    size: { length: 3, width: 1, height: 2 },
    physics: {
      mass: 20,
      maxAcceleration: 3,
      maxDeceleration: 5,
      maxSteeringAngle: Math.PI / 4,
      friction: 0.01,
      drag: 0.0003,
    },
    defaultCapacity: 1,
    defaultMaxSpeed: 25,
    defaultColor: '#FF8C42',
    modelConfig: {
      bodyShape: 'rounded',
      hasRoof: false,
      wheelPositions: [
        { x: -1, y: -0.5, z: 0 },
        { x: 1, y: -0.5, z: 0 },
      ],
      windowConfig: { front: false, rear: false, sides: false },
    },
  },
  taxi: {
    type: 'taxi',
    name: '出租车',
    size: { length: 8, width: 4, height: 3 },
    physics: {
      mass: 1500,
      maxAcceleration: 5,
      maxDeceleration: 8,
      maxSteeringAngle: Math.PI / 4,
      friction: 0.02,
      drag: 0.001,
    },
    defaultCapacity: 4,
    defaultMaxSpeed: 100,
    defaultColor: '#FFD93D',
    modelConfig: {
      bodyShape: 'sedan',
      hasRoof: true,
      wheelPositions: [
        { x: -3, y: -1, z: 2 },
        { x: 3, y: -1, z: 2 },
        { x: -3, y: -1, z: -2 },
        { x: 3, y: -1, z: -2 },
      ],
      windowConfig: { front: true, rear: true, sides: true },
    },
  },
};

/**
 * 车辆系统配置
 */
export interface VehicleSystemConfig {
  maxVehicles: number;
  spawnRate: number;
  despawnDistance: number;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: VehicleSystemConfig = {
  maxVehicles: 100,
  spawnRate: 0.1,
  despawnDistance: 500,
};

/**
 * 车辆系统类
 */
export class VehicleSystem {
  private vehicles: Map<string, VehicleConfig> = new Map();
  private vehicleStates: Map<string, VehicleState> = new Map();
  private config: VehicleSystemConfig;
  private eventManager: EventManager;

  constructor(config: VehicleSystemConfig = DEFAULT_CONFIG) {
    this.config = config;
    this.eventManager = new EventManager();
  }

  /**
   * 初始化车辆系统
   */
  async initialize(): Promise<void> {
    await this.loadVehicles();
    await this.spawnDefaultVehicles();
    logger.info(`VehicleSystem initialized with ${this.vehicles.size} vehicles`);
  }

  /**
   * 从数据库加载车辆
   */
  private async loadVehicles(): Promise<void> {
    try {
      const db = getDatabase();
      const vehicles = await db.vehicle.findMany();

      for (const vehicle of vehicles) {
        const vehicleConfig: VehicleConfig = {
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

        this.vehicles.set(vehicle.vehicle_id, vehicleConfig);
      }
    } catch (error) {
      logger.warn('Failed to load vehicles from database:', error);
    }
  }

  /**
   * 生成默认车辆
   */
  private async spawnDefaultVehicles(): Promise<void> {
    if (this.vehicles.size >= this.config.maxVehicles) {
      return;
    }

    const defaultVehicles = [
      { type: 'car' as VehicleType, color: '#FF6B6B', name: '红色小轿车' },
      { type: 'car' as VehicleType, color: '#4ECDC4', name: '青色小轿车' },
      { type: 'bus' as VehicleType, color: '#95E1D3', name: '公交车1号' },
      { type: 'taxi' as VehicleType, color: '#FFD93D', name: '出租车1号' },
      { type: 'motorcycle' as VehicleType, color: '#FFE66D', name: '黄色摩托车' },
    ];

    // 在主要道路旁生成车辆
    const spawnPositions = [
      { x: 0, y: 0, z: 20 },
      { x: 50, y: 0, z: 0 },
      { x: -50, y: 0, z: 0 },
      { x: 0, y: 0, z: -50 },
      { x: 80, y: 0, z: 80 },
    ];

    for (let i = 0; i < Math.min(defaultVehicles.length, spawnPositions.length); i++) {
      await this.createVehicle({
        ...defaultVehicles[i],
        position: spawnPositions[i],
      });
    }
  }

  /**
   * 创建车辆
   */
  async createVehicle(config: {
    type: VehicleType;
    color: string;
    name: string;
    position: Vector3D;
    ownerId?: string;
  }): Promise<VehicleConfig | null> {
    try {
      const vehicleId = `vehicle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const typeDef = VEHICLE_TYPES[config.type];

      const vehicleConfig: VehicleConfig = {
        vehicle_id: vehicleId,
        name: config.name,
        type: config.type,
        position: config.position,
        rotation: 0,
        speed: 0,
        capacity: typeDef.defaultCapacity,
        maxSpeed: typeDef.defaultMaxSpeed,
        color: config.color,
        status: 'parked',
        currentLocationId: 'unknown',
        ownerId: config.ownerId,
      };

      const db = getDatabase();
      await db.vehicle.create({
        data: {
          vehicle_id: vehicleId,
          name: vehicleConfig.name,
          type: vehicleConfig.type,
          position: vehicleConfig.position,
          rotation: vehicleConfig.rotation,
          speed: vehicleConfig.speed,
          capacity: vehicleConfig.capacity,
          max_speed: vehicleConfig.maxSpeed,
          color: vehicleConfig.color,
          status: vehicleConfig.status,
          current_location_id: vehicleConfig.currentLocationId,
          owner_agent_id: vehicleConfig.ownerId,
        },
      });

      // 创建车辆状态
      await db.vehicleState.create({
        data: {
          vehicle_id: vehicleId,
          acceleration: 0,
          steering_angle: 0,
          fuel: 100,
          health: 100,
          total_distance: 0,
          total_trips: 0,
        },
      });

      this.vehicles.set(vehicleId, vehicleConfig);
      logger.info(`Created vehicle: ${config.name} (${vehicleId})`);

      // 发送事件
      await this.emitVehicleEvent({
        type: 'vehicle_spawned',
        vehicle_id: vehicleId,
        timestamp: new Date(),
      });

      return vehicleConfig;
    } catch (error) {
      logger.error(`Failed to create vehicle ${config.name}:`, error);
      return null;
    }
  }

  /**
   * Agent进入车辆
   */
  async enterVehicle(agentId: string, vehicleId: string): Promise<boolean> {
    const vehicle = this.vehicles.get(vehicleId);
    if (!vehicle) {
      logger.warn(`Vehicle not found: ${vehicleId}`);
      return false;
    }

    if (vehicle.currentDriverId) {
      logger.warn(`Vehicle ${vehicleId} already has a driver`);
      return false;
    }

    try {
      const db = getDatabase();
      await db.vehicle.update({
        where: { vehicle_id: vehicleId },
        data: { current_driver_id: agentId },
      });

      vehicle.currentDriverId = agentId;
      vehicle.status = 'idle';

      // 记录交互
      await this.recordInteraction({
        vehicle_id: vehicleId,
        agent_id: agentId,
        interaction_type: 'enter',
        result: 'success',
      });

      // 发送事件
      await this.emitVehicleEvent({
        type: 'agent_entered_vehicle',
        vehicle_id: vehicleId,
        agent_id: agentId,
        timestamp: new Date(),
      });

      logger.info(`Agent ${agentId} entered vehicle ${vehicleId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to enter vehicle ${vehicleId}:`, error);
      return false;
    }
  }

  /**
   * Agent离开车辆
   */
  async exitVehicle(agentId: string, vehicleId: string): Promise<boolean> {
    const vehicle = this.vehicles.get(vehicleId);
    if (!vehicle) {
      logger.warn(`Vehicle not found: ${vehicleId}`);
      return false;
    }

    if (vehicle.currentDriverId !== agentId) {
      logger.warn(`Agent ${agentId} is not driving vehicle ${vehicleId}`);
      return false;
    }

    try {
      const db = getDatabase();
      await db.vehicle.update({
        where: { vehicle_id: vehicleId },
        data: {
          current_driver_id: null,
          status: 'parked',
          speed: 0,
        },
      });

      vehicle.currentDriverId = undefined;
      vehicle.status = 'parked';
      vehicle.speed = 0;

      // 记录交互
      await this.recordInteraction({
        vehicle_id: vehicleId,
        agent_id: agentId,
        interaction_type: 'exit',
        result: 'success',
      });

      // 发送事件
      await this.emitVehicleEvent({
        type: 'agent_exited_vehicle',
        vehicle_id: vehicleId,
        agent_id: agentId,
        timestamp: new Date(),
      });

      logger.info(`Agent ${agentId} exited vehicle ${vehicleId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to exit vehicle ${vehicleId}:`, error);
      return false;
    }
  }

  /**
   * 驾驶车辆
   */
  async driveVehicle(agentId: string, vehicleId: string, command: DriveCommand): Promise<boolean> {
    const vehicle = this.vehicles.get(vehicleId);
    if (!vehicle) {
      logger.warn(`Vehicle not found: ${vehicleId}`);
      return false;
    }

    if (vehicle.currentDriverId !== agentId) {
      logger.warn(`Agent ${agentId} is not driving vehicle ${vehicleId}`);
      return false;
    }

    const typeDef = VEHICLE_TYPES[vehicle.type];

    switch (command.action) {
      case 'accelerate':
        vehicle.speed = Math.min(vehicle.speed + (typeDef.physics.maxAcceleration * (command.intensity || 0.5)), vehicle.maxSpeed);
        vehicle.status = 'moving';
        break;
      case 'decelerate':
        vehicle.speed = Math.max(vehicle.speed - (typeDef.physics.maxDeceleration * (command.intensity || 0.5)), 0);
        if (vehicle.speed === 0) {
          vehicle.status = 'stopped';
        }
        break;
      case 'turnLeft':
        vehicle.rotation -= typeDef.physics.maxSteeringAngle * (command.intensity || 0.3);
        break;
      case 'turnRight':
        vehicle.rotation += typeDef.physics.maxSteeringAngle * (command.intensity || 0.3);
        break;
      case 'brake':
        vehicle.speed = Math.max(vehicle.speed - typeDef.physics.maxDeceleration * 2, 0);
        vehicle.status = 'stopped';
        break;
      case 'stop':
        vehicle.speed = 0;
        vehicle.status = 'stopped';
        break;
    }

    // 更新位置（简单的物理模拟）
    await this.updateVehiclePosition(vehicleId);

    // 更新数据库
    try {
      const db = getDatabase();
      await db.vehicle.update({
        where: { vehicle_id: vehicleId },
        data: {
          speed: vehicle.speed,
          rotation: vehicle.rotation,
          position: vehicle.position,
          status: vehicle.status,
        },
      });
    } catch (error) {
      logger.error(`Failed to update vehicle ${vehicleId}:`, error);
    }

    return true;
  }

  /**
   * 更新车辆位置
   */
  private async updateVehiclePosition(vehicleId: string): Promise<void> {
    const vehicle = this.vehicles.get(vehicleId);
    if (!vehicle || vehicle.speed === 0) {
      return;
    }

    // 根据速度和旋转角度更新位置
    const moveDistance = vehicle.speed * 0.01; // 简化的时间步长
    vehicle.position.x += Math.cos(vehicle.rotation) * moveDistance;
    vehicle.position.z += Math.sin(vehicle.rotation) * moveDistance;

    // 更新车辆状态
    const state = this.vehicleStates.get(vehicleId);
    if (state) {
      state.position = vehicle.position;
      state.rotation = vehicle.rotation;
      state.speed = vehicle.speed;
    }
  }

  /**
   * 记录车辆交互
   */
  private async recordInteraction(data: {
    vehicle_id: string;
    agent_id: string;
    interaction_type: VehicleInteractionType;
    result?: string;
  }): Promise<void> {
    try {
      const db = getDatabase();
      await db.vehicleInteraction.create({
        data: {
          vehicle_id: data.vehicle_id,
          agent_id: data.agent_id,
          interaction_type: data.interaction_type,
          result: data.result,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      logger.error('Failed to record vehicle interaction:', error);
    }
  }

  /**
   * 发送车辆事件
   */
  private async emitVehicleEvent(event: VehicleEvent): Promise<void> {
    await this.eventManager.emit('vehicle_event', event);
  }

  /**
   * 获取车辆
   */
  getVehicle(vehicleId: string): VehicleConfig | undefined {
    return this.vehicles.get(vehicleId);
  }

  /**
   * 获取所有车辆
   */
  getAllVehicles(): VehicleConfig[] {
    return Array.from(this.vehicles.values());
  }

  /**
   * 获取指定类型的车辆
   */
  getVehiclesByType(type: VehicleType): VehicleConfig[] {
    return Array.from(this.vehicles.values()).filter(v => v.type === type);
  }

  /**
   * 获取附近的车辆
   */
  getNearbyVehicles(position: Vector3D, radius: number): VehicleConfig[] {
    const nearby: VehicleConfig[] = [];

    for (const vehicle of this.vehicles.values()) {
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
  }

  /**
   * 获取车辆类型定义
   */
  getVehicleTypeDefinition(type: VehicleType): VehicleTypeDefinition | undefined {
    return VEHICLE_TYPES[type];
  }

  /**
   * 获取所有车辆类型定义
   */
  getAllVehicleTypes(): Record<VehicleType, VehicleTypeDefinition> {
    return VEHICLE_TYPES;
  }

  /**
   * 获取渲染数据
   */
  getRenderData(): VehicleConfig[] {
    return this.getAllVehicles();
  }
}

// 导出单例实例
export const vehicleSystem = new VehicleSystem();
