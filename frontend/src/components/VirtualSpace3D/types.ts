/**
 * VirtualSpace3D 类型定义
 */

import { TerrainFeatureData } from '../TerrainRenderer';
import { RoadData, IntersectionData } from '../RoadRenderer';
import { VehicleData } from '../VehicleRenderer';

/**
 * 3D Agent 数据
 */
export interface Agent3D {
  agent_id: string;
  agent_name: string;
  x: number;
  y: number;
  z: number;
  energy: number;
  mood: string;
  status: string;
}

/**
 * 3D 建筑物数据
 */
export interface Building3D {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  color: string;
}

/**
 * 3D 河流数据
 */
export interface River3D {
  id: string;
  name: string;
  path: { x: number; y: number; z: number }[];
  width: number;
}

/**
 * 城市边界
 */
export interface CityBounds {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
}

/**
 * 视角模式类型
 */
export type ViewMode = 'first-person' | 'second-person' | 'third-person';

/**
 * VirtualSpace3D 组件 Props
 */
export interface VirtualSpace3DProps {
  // Agent 和建筑
  agents: Agent3D[];
  buildings: Building3D[];
  onAgentClick?: (agentId: string) => void;
  currentSelectedAgentId?: string | null;

  // 视角模式
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;

  // 地形、道路、车辆数据
  terrainFeatures?: TerrainFeatureData[];
  roads?: RoadData[];
  intersections?: IntersectionData[];
  vehicles?: VehicleData[];

  // 城市特定数据
  rivers?: River3D[];
  cityBounds?: CityBounds;
  cityCenter?: { lat: number; lng: number };

  // 车辆交互
  onVehicleClick?: (vehicle: VehicleData) => void;

  // 功能开关
  enableTerrain?: boolean;
  enableRoads?: boolean;
  enableVehicles?: boolean;

  // 全屏控制
  externalIsFullscreen?: boolean;
  onFullscreenChange?: (isFullscreen: boolean) => void;

  // 移动端检测
  isMobile?: boolean;
  isTouchDevice?: boolean;
}

/**
 * Agent 物理状态
 */
export interface AgentPhysics {
  velocityY: number;
  isJumping: boolean;
  groundY: number;
}

/**
 * 车辆类型配置
 */
export interface VehicleTypeConfig {
  bodyShape: 'box' | 'rounded' | 'sedan' | 'suv';
  size: { length: number; width: number; height: number };
  hasRoof: boolean;
  windowConfig: { front: boolean; rear: boolean; sides: boolean };
  wheelPositions: THREE.Vector3[];
}
