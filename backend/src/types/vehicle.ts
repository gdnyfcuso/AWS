// 车辆相关类型定义

/**
 * 车辆类型
 */
export type VehicleType = 'car' | 'bus' | 'truck' | 'motorcycle' | 'bicycle' | 'taxi';

/**
 * 车辆状态
 */
export type VehicleStatus = 'parked' | 'moving' | 'stopped' | 'idle' | 'damaged';

/**
 * 车辆配置
 */
export interface VehicleConfig {
  vehicle_id: string;
  name: string;
  type: VehicleType;
  position: Vector3D;
  rotation: number;
  speed: number;
  capacity: number;
  maxSpeed: number;
  color: string;
  status: VehicleStatus;
  currentDriverId?: string;
  currentLocationId: string;
  ownerId?: string;
}

/**
 * 车辆状态快照
 */
export interface VehicleState {
  vehicle_id: string;
  position: Vector3D;
  rotation: number;
  speed: number;
  acceleration: number;
  steeringAngle: number;
  fuel?: number;
  health?: number;
  lastUpdated: Date;
}

/**
 * 车辆交互类型
 */
export type VehicleInteractionType = 'enter' | 'exit' | 'start' | 'stop' | 'park' | 'drive' | 'collision';

/**
 * 车辆交互记录
 */
export interface VehicleInteraction {
  id: string;
  vehicle_id: string;
  agent_id: string;
  interactionType: VehicleInteractionType;
  timestamp: Date;
  data?: Record<string, unknown>;
  result?: 'success' | 'failed';
}

/**
 * 车辆物理属性
 */
export interface VehiclePhysics {
  mass: number;
  maxAcceleration: number;
  maxDeceleration: number;
  maxSteeringAngle: number;
  friction: number;
  drag: number;
}

/**
 * 车辆尺寸
 */
export interface VehicleSize {
  length: number;
  width: number;
  height: number;
}

/**
 * 车辆类型定义
 */
export interface VehicleTypeDefinition {
  type: VehicleType;
  name: string;
  size: VehicleSize;
  physics: VehiclePhysics;
  defaultCapacity: number;
  defaultMaxSpeed: number;
  defaultColor: string;
  modelConfig: VehicleModelConfig;
}

/**
 * 车辆模型配置（用于渲染）
 */
export interface VehicleModelConfig {
  bodyShape: 'box' | 'rounded' | 'sedan' | 'suv';
  hasRoof: boolean;
  wheelPositions: Vector3D[];
  windowConfig?: {
    front: boolean;
    rear: boolean;
    sides: boolean;
  };
}

/**
 * 驾驶指令
 */
export interface DriveCommand {
  vehicle_id: string;
  action: 'accelerate' | 'decelerate' | 'turnLeft' | 'turnRight' | 'brake' | 'stop';
  intensity?: number; // 0-1
  duration?: number; // milliseconds
}

/**
 * 导航路径
 */
export interface NavigationPath {
  waypoints: Vector3D[];
  currentWaypointIndex: number;
  totalDistance: number;
  estimatedTime: number;
}

/**
 * 向量3D（通用）
 */
export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

/**
 * 车辆事件类型
 */
export type VehicleEventType =
  | 'vehicle_spawned'
  | 'vehicle_despawned'
  | 'agent_entered_vehicle'
  | 'agent_exited_vehicle'
  | 'vehicle_started'
  | 'vehicle_stopped'
  | 'vehicle_moved'
  | 'collision_occurred';

/**
 * 车辆事件
 */
export interface VehicleEvent {
  type: VehicleEventType;
  vehicle_id: string;
  agent_id?: string;
  timestamp: Date;
  data?: Record<string, unknown>;
}
