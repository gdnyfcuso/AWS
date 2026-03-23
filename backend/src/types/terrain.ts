// 地形相关类型定义

/**
 * 地形特征类型
 */
export type TerrainType = 'mountain' | 'hill' | 'water' | 'river' | 'ocean' | 'plain' | 'forest';

/**
 * 地形特征配置
 */
export interface TerrainFeature {
  id: string;
  feature_id: string;
  type: TerrainType;
  name?: string;
  position: Vector3D;
  size: Size3D;
  realCoordinates?: GeoCoordinates;
  metadata?: Record<string, unknown>;
}

/**
 * 山脉配置
 */
export interface MountainConfig {
  name: string;
  position: Vector3D;
  height: number;
  baseRadius: number;
  hasSnowCap: boolean;
  snowCapHeight?: number;
  color: string;
  snowColor?: string;
  roughness?: number;
}

/**
 * 水域配置
 */
export interface WaterConfig {
  name: string;
  position: Vector3D;
  size: Size2D;
  depth?: number;
  color: string;
  transparency: number;
  flowDirection?: Vector2D;
  waveIntensity?: number;
}

/**
 * 河流配置
 */
export interface RiverConfig {
  name: string;
  path: Vector3D[];
  width: number;
  depth: number;
  color: string;
  transparency: number;
}

/**
 * 植被配置
 */
export interface VegetationConfig {
  type: 'tree' | 'bush' | 'grass';
  position: Vector3D;
  density: number;
  color: string;
  size: number;
}

/**
 * 地形区域
 */
export interface TerrainZone {
  id: string;
  name: string;
  type: TerrainType;
  bounds: BoundingBox;
  features: string[]; // feature IDs
}

/**
 * 向量2D
 */
export interface Vector2D {
  x: number;
  y: number;
}

/**
 * 向量3D
 */
export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

/**
 * 尺寸2D
 */
export interface Size2D {
  width: number;
  height: number;
}

/**
 * 尺寸3D
 */
export interface Size3D {
  width: number;
  height: number;
  depth: number;
}

/**
 * 地理坐标（真实世界）
 */
export interface GeoCoordinates {
  lat: number;
  lng: number;
}

/**
 * 边界框
 */
export interface BoundingBox {
  min: Vector3D;
  max: Vector3D;
}

/**
 * 地形生成配置
 */
export interface TerrainGenerationConfig {
  mapSize: number; // 虚拟地图尺寸（单位）
  realBounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
  centerPoint: GeoCoordinates;
  terrainTypes: TerrainType[];
}
