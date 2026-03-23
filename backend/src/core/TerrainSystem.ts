// 地形生成系统 - 生成北京周边地形特征

import { createLogger } from '../utils/logger';
import { mapCoordinateSystem } from './MapCoordinateSystem';
import {
  TerrainFeature,
  TerrainType,
  MountainConfig,
  WaterConfig,
  RiverConfig,
  TerrainZone,
} from '../types/terrain';
import { getDatabase } from '../services/database';

const logger = createLogger('TerrainSystem');

/**
 * 地形生成配置
 */
export interface TerrainGenerationConfig {
  enabledZones: TerrainType[];
  mountainDensity: number; // 0-1
  vegetationDensity: number; // 0-1
  cartoonStyle: boolean;
}

/**
 * 默认地形配置
 */
const DEFAULT_TERRAIN_CONFIG: TerrainGenerationConfig = {
  enabledZones: ['mountain', 'hill', 'water', 'river', 'plain'],
  mountainDensity: 0.3,
  vegetationDensity: 0.4,
  cartoonStyle: true,
};

/**
 * 地形系统类
 */
export class TerrainSystem {
  private features: Map<string, TerrainFeature> = new Map();
  private zones: Map<string, TerrainZone> = new Map();
  private config: TerrainGenerationConfig;

  constructor(config: TerrainGenerationConfig = DEFAULT_TERRAIN_CONFIG) {
    this.config = config;
  }

  /**
   * 初始化地形系统
   */
  async initialize(): Promise<void> {
    await this.loadFeatures();
    await this.generateDefaultTerrain();
    logger.info(`TerrainSystem initialized with ${this.features.size} features`);
  }

  /**
   * 从数据库加载地形特征
   */
  private async loadFeatures(): Promise<void> {
    try {
      const db = getDatabase();
      const features = await db.terrainFeature.findMany();

      for (const feature of features) {
        this.features.set(feature.feature_id, {
          id: feature.id,
          feature_id: feature.feature_id,
          type: feature.type as TerrainType,
          name: feature.name || undefined,
          position: feature.position as { x: number; y: number; z: number },
          size: feature.size as { width: number; height: number; depth: number },
          realCoordinates: feature.real_coordinates as { lat: number; lng: number } | undefined,
          metadata: feature.metadata as Record<string, unknown> | undefined,
        });
      }
    } catch (error) {
      logger.warn('Failed to load terrain features from database:', error);
    }
  }

  /**
   * 生成默认北京地形
   */
  private async generateDefaultTerrain(): Promise<void> {
    if (this.features.size > 0) {
      logger.info('Terrain features already loaded, skipping generation');
      return;
    }

    // 西部山区（太行山脉余脉）
    await this.generateWesternMountains();

    // 北部山区（燕山山脉）
    await this.generateNorthernMountains();

    // 水系（潮白河、永定河）
    await this.generateRiverSystems();

    // 东南平原
    await this.generateSoutheastPlains();

    // 创建地形区域
    await this.createTerrainZones();
  }

  /**
   * 生成西部山区（太行山脉余脉）
   */
  private async generateWesternMountains(): Promise<void> {
    const mountainConfigs: MountainConfig[] = [
      {
        name: '太行山主峰',
        position: mapCoordinateSystem.realToVirtual(39.75, 115.7, 150),
        height: 180,
        baseRadius: 80,
        hasSnowCap: false,
        color: '#8B4513', // 棕色
        roughness: 0.8,
      },
      {
        name: '百花山',
        position: mapCoordinateSystem.realToVirtual(39.85, 115.6, 120),
        height: 140,
        baseRadius: 60,
        hasSnowCap: false,
        color: '#A0522D', // 赭色
        roughness: 0.7,
      },
      {
        name: '灵山',
        position: mapCoordinateSystem.realToVirtual(39.95, 115.5, 160),
        height: 170,
        baseRadius: 70,
        hasSnowCap: true,
        snowCapHeight: 50,
        color: '#8B4513',
        snowColor: '#F5F5F5',
        roughness: 0.75,
      },
      {
        name: '妙峰山',
        position: mapCoordinateSystem.realToVirtual(39.82, 116.0, 100),
        height: 110,
        baseRadius: 50,
        hasSnowCap: false,
        color: '#CD853F', // 秘鲁色
        roughness: 0.65,
      },
      {
        name: '龙门山脉',
        position: mapCoordinateSystem.realToVirtual(39.88, 115.8, 90),
        height: 95,
        baseRadius: 45,
        hasSnowCap: false,
        color: '#D2691E', // 巧克力色
        roughness: 0.7,
      },
    ];

    for (const config of mountainConfigs) {
      await this.createMountain(config);
    }

    // 生成山丘群
    const hillPositions = [
      { lat: 39.78, lng: 115.65 },
      { lat: 39.82, lng: 115.75 },
      { lat: 39.90, lng: 115.55 },
      { lat: 39.86, lng: 115.85 },
      { lat: 39.92, lng: 115.65 },
    ];

    for (let i = 0; i < hillPositions.length; i++) {
      const pos = hillPositions[i];
      const virtualPos = mapCoordinateSystem.realToVirtual(pos.lat, pos.lng, 40 + Math.random() * 30);
      await this.createHill({
        name: `西山丘陵${i + 1}`,
        position: virtualPos,
        height: 40 + Math.random() * 30,
        baseRadius: 25 + Math.random() * 15,
        color: '#9ACD32', // 黄绿色
        roughness: 0.5,
      });
    }
  }

  /**
   * 生成北部山区（燕山山脉）
   */
  private async generateNorthernMountains(): Promise<void> {
    const mountainConfigs: MountainConfig[] = [
      {
        name: '海坨山',
        position: mapCoordinateSystem.realToVirtual(40.55, 115.85, 200),
        height: 200,
        baseRadius: 90,
        hasSnowCap: true,
        snowCapHeight: 70,
        color: '#6B4423', // 深棕色
        snowColor: '#FFFFFF',
        roughness: 0.85,
      },
      {
        name: '雾灵山',
        position: mapCoordinateSystem.realToVirtual(40.35, 117.25, 180),
        height: 185,
        baseRadius: 85,
        hasSnowCap: true,
        snowCapHeight: 60,
        color: '#7B5A3A',
        snowColor: '#FAFAFA',
        roughness: 0.8,
      },
      {
        name: '云蒙山',
        position: mapCoordinateSystem.realToVirtual(40.45, 116.75, 160),
        height: 165,
        baseRadius: 75,
        hasSnowCap: false,
        color: '#8B6914', // 橄榄棕
        roughness: 0.75,
      },
      {
        name: '司马台长城',
        position: mapCoordinateSystem.realToVirtual(40.38, 117.12, 120),
        height: 130,
        baseRadius: 60,
        hasSnowCap: false,
        color: '#A0826D', // 暖灰色
        roughness: 0.7,
      },
      {
        name: '箭扣长城',
        position: mapCoordinateSystem.realToVirtual(40.42, 116.65, 110),
        height: 115,
        baseRadius: 55,
        hasSnowCap: false,
        color: '#9C8B7A',
        roughness: 0.72,
      },
    ];

    for (const config of mountainConfigs) {
      await this.createMountain(config);
    }

    // 生成燕山山系延伸
    const ranges = [
      { start: { lat: 40.3, lng: 116.0 }, end: { lat: 40.5, lng: 116.8 }, count: 8 },
      { start: { lat: 40.2, lng: 117.0 }, end: { lat: 40.6, lng: 117.3 }, count: 5 },
    ];

    for (const range of ranges) {
      for (let i = 0; i < range.count; i++) {
        const t = i / (range.count - 1);
        const lat = range.start.lat + (range.end.lat - range.start.lat) * t;
        const lng = range.start.lng + (range.end.lng - range.start.lng) * t;
        const height = 60 + Math.random() * 50;

        await this.createHill({
          name: `燕山余脉${i + 1}`,
          position: mapCoordinateSystem.realToVirtual(lat, lng, height),
          height: height,
          baseRadius: 30 + Math.random() * 20,
          color: '#8B7355',
          roughness: 0.65,
        });
      }
    }
  }

  /**
   * 生成水系（河流）
   */
  private async generateRiverSystems(): Promise<void> {
    // 永定河
    const yongdingPath = [
      { lat: 39.85, lng: 115.5 },
      { lat: 39.82, lng: 115.8 },
      { lat: 39.78, lng: 116.1 },
      { lat: 39.75, lng: 116.3 },
      { lat: 39.70, lng: 116.5 },
    ];
    await this.createRiver({
      name: '永定河',
      path: yongdingPath.map(p => mapCoordinateSystem.realToVirtual(p.lat, p.lng, 0)),
      width: 15,
      depth: 3,
      color: '#4FC3F7',
      transparency: 0.6,
    });

    // 潮白河
    const chaobaiPath = [
      { lat: 40.3, lng: 116.8 },
      { lat: 40.15, lng: 116.85 },
      { lat: 39.95, lng: 116.9 },
      { lat: 39.75, lng: 116.95 },
      { lat: 39.6, lng: 116.85 },
    ];
    await this.createRiver({
      name: '潮白河',
      path: chaobaiPath.map(p => mapCoordinateSystem.realToVirtual(p.lat, p.lng, 0)),
      width: 18,
      depth: 4,
      color: '#29B6F6',
      transparency: 0.55,
    });

    // 温榆河
    const wenyuPath = [
      { lat: 40.1, lng: 116.5 },
      { lat: 40.0, lng: 116.55 },
      { lat: 39.9, lng: 116.65 },
      { lat: 39.8, lng: 116.75 },
    ];
    await this.createRiver({
      name: '温榆河',
      path: wenyuPath.map(p => mapCoordinateSystem.realToVirtual(p.lat, p.lng, 0)),
      width: 12,
      depth: 2.5,
      color: '#03A9F4',
      transparency: 0.5,
    });

    // 北运河
    const beiyunPath = [
      { lat: 39.92, lng: 116.65 },
      { lat: 39.9, lng: 116.7 },
      { lat: 39.85, lng: 116.75 },
      { lat: 39.78, lng: 116.8 },
    ];
    await this.createRiver({
      name: '北运河',
      path: beiyunPath.map(p => mapCoordinateSystem.realToVirtual(p.lat, p.lng, 0)),
      width: 10,
      depth: 2,
      color: '#0288D1',
      transparency: 0.45,
    });
  }

  /**
   * 生成东南平原
   */
  private async generateSoutheastPlains(): Promise<void> {
    // 大广平原区域
    const plainBounds = {
      min: mapCoordinateSystem.realToVirtual(39.5, 116.5, 0),
      max: mapCoordinateSystem.realToVirtual(39.85, 117.4, 0),
    };

    await this.createZone({
      id: 'southeast_plain',
      name: '东南平原',
      type: 'plain',
      bounds: {
        min: { x: plainBounds.min.x, y: 0, z: plainBounds.min.z },
        max: { x: plainBounds.max.x, y: 5, z: plainBounds.max.z },
      },
      features: [],
    });
  }

  /**
   * 创建地形区域
   */
  private async createTerrainZones(): Promise<void> {
    const zones = [
      {
        id: 'western_mountains',
        name: '西部山区',
        type: 'mountain' as TerrainType,
        bounds: {
          min: mapCoordinateSystem.realToVirtual(39.7, 115.4, 0),
          max: mapCoordinateSystem.realToVirtual(40.1, 116.2, 200),
        },
      },
      {
        id: 'northern_mountains',
        name: '北部山区',
        type: 'mountain' as TerrainType,
        bounds: {
          min: mapCoordinateSystem.realToVirtual(40.2, 116.0, 0),
          max: mapCoordinateSystem.realToVirtual(40.8, 117.5, 220),
        },
      },
      {
        id: 'central_plains',
        name: '中部平原',
        type: 'plain' as TerrainType,
        bounds: {
          min: mapCoordinateSystem.realToVirtual(39.7, 116.2, 0),
          max: mapCoordinateSystem.realToVirtual(40.1, 116.8, 20),
        },
      },
    ];

    for (const zone of zones) {
      await this.createZone(zone);
    }
  }

  /**
   * 创建山脉特征
   */
  async createMountain(config: MountainConfig): Promise<TerrainFeature | null> {
    try {
      const db = getDatabase();
      const featureId = `mountain_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const feature = await db.terrainFeature.create({
        data: {
          feature_id: featureId,
          type: 'mountain',
          name: config.name,
          position: config.position,
          size: {
            width: config.baseRadius * 2,
            height: config.height,
            depth: config.baseRadius * 2,
          },
          metadata: {
            hasSnowCap: config.hasSnowCap,
            snowCapHeight: config.snowCapHeight,
            snowColor: config.snowColor,
            roughness: config.roughness,
          },
        },
      });

      const terrainFeature: TerrainFeature = {
        id: feature.id,
        feature_id: feature.feature_id,
        type: 'mountain',
        name: config.name,
        position: config.position,
        size: {
          width: config.baseRadius * 2,
          height: config.height,
          depth: config.baseRadius * 2,
        },
        metadata: {
          color: config.color,
          hasSnowCap: config.hasSnowCap,
          snowCapHeight: config.snowCapHeight,
          snowColor: config.snowColor,
          roughness: config.roughness,
        },
      };

      this.features.set(featureId, terrainFeature);
      logger.info(`Created mountain: ${config.name}`);
      return terrainFeature;
    } catch (error) {
      logger.error(`Failed to create mountain ${config.name}:`, error);
      return null;
    }
  }

  /**
   * 创建山丘特征
   */
  async createHill(config: MountainConfig): Promise<TerrainFeature | null> {
    try {
      const db = getDatabase();
      const featureId = `hill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const feature = await db.terrainFeature.create({
        data: {
          feature_id: featureId,
          type: 'hill',
          name: config.name,
          position: config.position,
          size: {
            width: config.baseRadius * 2,
            height: config.height,
            depth: config.baseRadius * 2,
          },
          metadata: {
            roughness: config.roughness,
          },
        },
      });

      const terrainFeature: TerrainFeature = {
        id: feature.id,
        feature_id: feature.feature_id,
        type: 'hill',
        name: config.name,
        position: config.position,
        size: {
          width: config.baseRadius * 2,
          height: config.height,
          depth: config.baseRadius * 2,
        },
        metadata: {
          color: config.color,
          roughness: config.roughness,
        },
      };

      this.features.set(featureId, terrainFeature);
      return terrainFeature;
    } catch (error) {
      logger.error(`Failed to create hill ${config.name}:`, error);
      return null;
    }
  }

  /**
   * 创建河流
   */
  async createRiver(config: RiverConfig): Promise<void> {
    try {
      const db = getDatabase();
      const featureId = `river_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // 计算河流边界框
      const allX = config.path.map(p => p.x);
      const allZ = config.path.map(p => p.z);
      const minX = Math.min(...allX) - config.width / 2;
      const maxX = Math.max(...allX) + config.width / 2;
      const minZ = Math.min(...allZ) - config.width / 2;
      const maxZ = Math.max(...allZ) + config.width / 2;

      await db.terrainFeature.create({
        data: {
          feature_id: featureId,
          type: 'river',
          name: config.name,
          position: { x: (minX + maxX) / 2, y: 0, z: (minZ + maxZ) / 2 },
          size: {
            width: maxX - minX,
            height: config.depth,
            depth: maxZ - minZ,
          },
          metadata: {
            path: config.path,
            width: config.width,
            depth: config.depth,
            color: config.color,
            transparency: config.transparency,
          },
        },
      });

      const terrainFeature: TerrainFeature = {
        id: featureId,
        feature_id: featureId,
        type: 'river',
        name: config.name,
        position: { x: (minX + maxX) / 2, y: 0, z: (minZ + maxZ) / 2 },
        size: {
          width: maxX - minX,
          height: config.depth,
          depth: maxZ - minZ,
        },
        metadata: {
          path: config.path,
          width: config.width,
          depth: config.depth,
          color: config.color,
          transparency: config.transparency,
        },
      };

      this.features.set(featureId, terrainFeature);
      logger.info(`Created river: ${config.name}`);
    } catch (error) {
      logger.error(`Failed to create river ${config.name}:`, error);
    }
  }

  /**
   * 创建地形区域
   */
  async createZone(zone: TerrainZone): Promise<void> {
    this.zones.set(zone.id, zone);
    logger.info(`Created terrain zone: ${zone.name}`);
  }

  /**
   * 获取所有地形特征
   */
  getAllFeatures(): TerrainFeature[] {
    return Array.from(this.features.values());
  }

  /**
   * 按类型获取地形特征
   */
  getFeaturesByType(type: TerrainType): TerrainFeature[] {
    return Array.from(this.features.values()).filter(f => f.type === type);
  }

  /**
   * 获取指定区域内的地形特征
   */
  getFeaturesInBounds(min: { x: number; z: number }, max: { x: number; z: number }): TerrainFeature[] {
    return Array.from(this.features.values()).filter(f => {
      const pos = f.position;
      return pos.x >= min.x && pos.x <= max.x && pos.z >= min.z && pos.z <= max.z;
    });
  }

  /**
   * 获取地形区域
   */
  getZone(zoneId: string): TerrainZone | undefined {
    return this.zones.get(zoneId);
  }

  /**
   * 获取所有地形区域
   */
  getAllZones(): TerrainZone[] {
    return Array.from(this.zones.values());
  }

  /**
   * 获取地形数据用于渲染
   */
  getRenderData(): {
    mountains: TerrainFeature[];
    hills: TerrainFeature[];
    rivers: TerrainFeature[];
    plains: TerrainFeature[];
  } {
    return {
      mountains: this.getFeaturesByType('mountain'),
      hills: this.getFeaturesByType('hill'),
      rivers: this.getFeaturesByType('river'),
      plains: this.getFeaturesByType('plain'),
    };
  }
}

// 导出单例实例
export const terrainSystem = new TerrainSystem();
