/**
 * 城市级地形加载系统
 * 根据 Agent 所在城市加载对应的地形数据
 * 1:1 比例配置: 1虚拟单位 = 1米
 */

import { createLogger } from '../utils/logger';
import { getDatabase } from '../services/database';
import {
  getCityConfig,
  findNearestCity,
  latLngToMeters,
  CityConfig,
} from '../config/cities';
import {
  TerrainFeature,
  TerrainType,
  MountainConfig,
  RiverConfig,
  TerrainZone,
} from '../types/terrain';

const logger = createLogger('CityTerrainSystem');

/**
 * 地形数据接口
 */
export interface TerrainData {
  city: CityConfig | null;
  mountains: TerrainFeature[];
  hills: TerrainFeature[];
  rivers: TerrainFeature[];
  plains: TerrainFeature[];
  waters: TerrainFeature[];
}

/**
 * 高程数据点
 */
export interface ElevationPoint {
  lat: number;
  lng: number;
  elevation: number; // 米
}

/**
 * 城市地形系统类
 */
export class CityTerrainSystem {
  private cityCache: Map<string, TerrainData> = new Map();
  private initializationPromises: Map<string, Promise<TerrainData>> = new Map();

  /**
   * 根据 Agent ID 获取城市地形数据
   */
  async getTerrainByAgentId(agentId: string): Promise<TerrainData> {
    try {
      const db = getDatabase();
      const agent = await db.agent.findUnique({
        where: { agent_id: agentId },
        select: {
          city: true,
          latitude: true,
          longitude: true,
        },
      });

      if (!agent) {
        logger.warn(`Agent ${agentId} not found, using default terrain`);
        return this.getDefaultTerrain();
      }

      // 优先使用城市名称
      if (agent.city) {
        return this.getTerrainByCityName(agent.city);
      }

      // 如果没有城市名称，使用经纬度查找
      if (agent.latitude !== null && agent.longitude !== null) {
        return this.getTerrainByCoordinates(agent.latitude, agent.longitude);
      }

      return this.getDefaultTerrain();
    } catch (error) {
      logger.error(`Failed to get terrain for agent ${agentId}:`, error);
      return this.getDefaultTerrain();
    }
  }

  /**
   * 根据城市名称获取地形数据
   */
  async getTerrainByCityName(cityName: string): Promise<TerrainData> {
    const cityKey = cityName.toLowerCase().replace(/市$/, '');

    // 检查缓存
    if (this.cityCache.has(cityKey)) {
      return this.cityCache.get(cityKey)!;
    }

    // 检查是否正在初始化
    if (this.initializationPromises.has(cityKey)) {
      return this.initializationPromises.get(cityKey)!;
    }

    // 获取城市配置
    const cityConfig = getCityConfig(cityName);
    if (!cityConfig) {
      logger.warn(`City config not found for ${cityName}, using default terrain`);
      return this.getDefaultTerrain();
    }

    // 创建初始化 Promise
    const initPromise = this.loadCityTerrain(cityConfig);
    this.initializationPromises.set(cityKey, initPromise);

    try {
      const terrainData = await initPromise;
      this.cityCache.set(cityKey, terrainData);
      return terrainData;
    } finally {
      this.initializationPromises.delete(cityKey);
    }
  }

  /**
   * 根据经纬度获取地形数据
   */
  async getTerrainByCoordinates(lat: number, lng: number): Promise<TerrainData> {
    const cityConfig = findNearestCity(lat, lng);
    if (!cityConfig) {
      logger.warn(`No city found near ${lat}, ${lng}, using default terrain`);
      return this.getDefaultTerrain();
    }

    // 使用城市ID而不是城市名称来查找
    return this.getTerrainByCityName(cityConfig.id);
  }

  /**
   * 加载城市地形数据
   */
  private async loadCityTerrain(city: CityConfig, forceRegenerate = false): Promise<TerrainData> {
    logger.info(`Loading terrain for city: ${city.name}, forceRegenerate: ${forceRegenerate}`);

    try {
      const db = getDatabase();

      // 检查数据库中是否已有缓存的地形数据
      const cityRecord = await db.city.findUnique({
        where: { city_id: city.id },
        include: {
          terrain_features: true,
        },
      });

      // 如果不是强制重新生成，且有缓存数据，则使用缓存
      if (!forceRegenerate && cityRecord && cityRecord.terrain_cached) {
        logger.info(`Using cached terrain data for ${city.name}`);
        return this.dbFeaturesToTerrainData(cityRecord.terrain_features, city);
      }

      // 生成城市地形
      const terrainData = await this.generateCityTerrain(city);

      // 保存到数据库
      await this.cacheCityTerrain(city.id, terrainData);

      return terrainData;
    } catch (error) {
      logger.error(`Failed to load city terrain for ${city.name}:`, error);
      return this.getDefaultTerrain();
    }
  }

  /**
   * 生成城市地形
   */
  private async generateCityTerrain(city: CityConfig): Promise<TerrainData> {
    logger.info(`Generating terrain for city: ${city.name}`);

    const terrainData: TerrainData = {
      city,
      mountains: [],
      hills: [],
      rivers: [],
      plains: [],
      waters: [],
    };

    // 根据城市特征生成地形
    if (city.terrainSource === 'real_data') {
      // 使用真实数据生成地形（这里简化为程序生成）
      await this.generateRealisticTerrain(city, terrainData);
    } else {
      // 使用生成式地形
      await this.generateProceduralTerrain(city, terrainData);
    }

    return terrainData;
  }

  /**
   * 生成真实风格地形（基于地理特征）
   */
  private async generateRealisticTerrain(
    city: CityConfig,
    terrainData: TerrainData
  ): Promise<void> {
    const { center, bounds } = city;

    // 坐标转换辅助函数
    const toVirtual = (lat: number, lng: number, y: number = 0) => {
      const meters = latLngToMeters(lat, lng, center.lat, center.lng);
      return {
        x: meters.x + city.virtualCenterX,
        y,
        z: meters.z + city.virtualCenterZ,
      };
    };

    // 根据城市地理特征生成地形
    switch (city.id) {
      case 'beijing':
        // 北京：西部太行山脉，北部燕山山脉，东南平原
        await this.generateBeijingTerrain(toVirtual, terrainData);
        break;

      case 'shanghai':
        // 上海：长江三角洲平原，黄浦江
        await this.generateShanghaiTerrain(toVirtual, terrainData);
        break;

      case 'guangzhou':
      case 'shenzhen':
        // 广州/深圳：珠江三角洲，丘陵
        await this.generatePearlRiverDeltaTerrain(toVirtual, terrainData);
        break;

      case 'hangzhou':
        // 杭州：西湖，钱塘江
        await this.generateHangzhouTerrain(toVirtual, terrainData);
        break;

      case 'chengdu':
        // 成都：四川盆地
        await this.generateChengduTerrain(toVirtual, terrainData);
        break;

      case 'xian':
        // 西安：秦岭山脉，渭河平原
        await this.generateXianTerrain(toVirtual, terrainData);
        break;

      default:
        // 默认平原地形
        await this.generateDefaultCityTerrain(toVirtual, terrainData);
        break;
    }
  }

  /**
   * 生成北京地形
   */
  private async generateBeijingTerrain(
    toVirtual: (lat: number, lng: number, y?: number) => { x: number; y: number; z: number },
    terrainData: TerrainData
  ): Promise<void> {
    // 西部山区（太行山脉余脉）
    const westernMountains: MountainConfig[] = [
      {
        name: '太行山余脉-主峰',
        position: toVirtual(39.75, 115.7, 150),
        height: 180,
        baseRadius: 80,
        hasSnowCap: false,
        color: '#8B4513',
        roughness: 0.8,
      },
      {
        name: '百花山',
        position: toVirtual(39.85, 115.6, 120),
        height: 140,
        baseRadius: 60,
        hasSnowCap: false,
        color: '#A0522D',
        roughness: 0.7,
      },
      {
        name: '灵山',
        position: toVirtual(39.95, 115.5, 160),
        height: 170,
        baseRadius: 70,
        hasSnowCap: true,
        snowCapHeight: 50,
        color: '#8B4513',
        snowColor: '#F5F5F5',
        roughness: 0.75,
      },
    ];

    for (const config of westernMountains) {
      terrainData.mountains.push(this.createMountainFeature(config));
    }

    // 北部山区（燕山山脉）
    const northernMountains: MountainConfig[] = [
      {
        name: '海坨山',
        position: toVirtual(40.55, 115.85, 200),
        height: 200,
        baseRadius: 90,
        hasSnowCap: true,
        snowCapHeight: 70,
        color: '#6B4423',
        snowColor: '#FFFFFF',
        roughness: 0.85,
      },
      {
        name: '雾灵山',
        position: toVirtual(40.35, 117.25, 180),
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
        position: toVirtual(40.45, 116.75, 160),
        height: 165,
        baseRadius: 75,
        hasSnowCap: false,
        color: '#8B6914',
        roughness: 0.75,
      },
    ];

    for (const config of northernMountains) {
      terrainData.mountains.push(this.createMountainFeature(config));
    }

    // 永定河
    terrainData.rivers.push(this.createRiverFeature({
      name: '永定河',
      path: [
        toVirtual(39.85, 115.5),
        toVirtual(39.82, 115.8),
        toVirtual(39.78, 116.1),
        toVirtual(39.75, 116.3),
        toVirtual(39.70, 116.5),
      ],
      width: 15,
      depth: 3,
      color: '#4FC3F7',
      transparency: 0.6,
    }));

    // 潮白河
    terrainData.rivers.push(this.createRiverFeature({
      name: '潮白河',
      path: [
        toVirtual(40.3, 116.8),
        toVirtual(40.15, 116.85),
        toVirtual(39.95, 116.9),
        toVirtual(39.75, 116.95),
        toVirtual(39.6, 116.85),
      ],
      width: 18,
      depth: 4,
      color: '#29B6F6',
      transparency: 0.55,
    }));
  }

  /**
   * 生成上海地形
   */
  private async generateShanghaiTerrain(
    toVirtual: (lat: number, lng: number, y?: number) => { x: number; y: number; z: number },
    terrainData: TerrainData
  ): Promise<void> {
    // 黄浦江
    terrainData.rivers.push(this.createRiverFeature({
      name: '黄浦江',
      path: [
        toVirtual(31.25, 121.0),
        toVirtual(31.22, 121.35),
        toVirtual(31.18, 121.50),
        toVirtual(31.15, 121.55),
        toVirtual(31.10, 121.60),
      ],
      width: 30,
      depth: 5,
      color: '#29B6F6',
      transparency: 0.5,
    }));

    // 长江口
    terrainData.waters.push(this.createWaterFeature({
      name: '长江口',
      position: toVirtual(31.35, 121.75),
      size: { width: 20000, height: 5, depth: 15000 },
      color: '#1E88E5',
      transparency: 0.6,
    }));

    // 少量小山丘（佘山等）
    terrainData.hills.push(this.createMountainFeature({
      name: '佘山',
      position: toVirtual(31.10, 121.18, 50),
      height: 50,
      baseRadius: 30,
      hasSnowCap: false,
      color: '#8BC34A',
      roughness: 0.5,
    }));
  }

  /**
   * 生成珠江三角洲地形
   */
  private async generatePearlRiverDeltaTerrain(
    toVirtual: (lat: number, lng: number, y?: number) => { x: number; y: number; z: number },
    terrainData: TerrainData
  ): Promise<void> {
    // 珠江
    terrainData.rivers.push(this.createRiverFeature({
      name: '珠江',
      path: [
        toVirtual(23.15, 113.5),
        toVirtual(23.12, 113.6),
        toVirtual(23.08, 113.8),
        toVirtual(23.05, 114.0),
        toVirtual(22.8, 114.2),
      ],
      width: 25,
      depth: 4,
      color: '#039BE5',
      transparency: 0.55,
    }));

    // 丘陵地带
    const hills: MountainConfig[] = [
      {
        name: '白云山',
        position: toVirtual(23.18, 113.3, 80),
        height: 80,
        baseRadius: 40,
        hasSnowCap: false,
        color: '#7CB342',
        roughness: 0.6,
      },
      {
        name: '梧桐山',
        position: toVirtual(22.65, 114.2, 100),
        height: 100,
        baseRadius: 50,
        hasSnowCap: false,
        color: '#689F38',
        roughness: 0.65,
      },
    ];

    for (const config of hills) {
      terrainData.hills.push(this.createMountainFeature(config));
    }
  }

  /**
   * 生成杭州地形
   */
  private async generateHangzhouTerrain(
    toVirtual: (lat: number, lng: number, y?: number) => { x: number; y: number; z: number },
    terrainData: TerrainData
  ): Promise<void> {
    // 西湖
    terrainData.waters.push(this.createWaterFeature({
      name: '西湖',
      position: toVirtual(30.25, 120.13),
      size: { width: 3000, height: 3, depth: 2500 },
      color: '#4FC3F7',
      transparency: 0.5,
    }));

    // 钱塘江
    terrainData.rivers.push(this.createRiverFeature({
      name: '钱塘江',
      path: [
        toVirtual(30.0, 119.8),
        toVirtual(30.1, 120.0),
        toVirtual(30.25, 120.15),
        toVirtual(30.35, 120.5),
        toVirtual(30.45, 120.9),
      ],
      width: 20,
      depth: 4,
      color: '#0288D1',
      transparency: 0.6,
    }));
  }

  /**
   * 生成成都地形
   */
  private async generateChengduTerrain(
    toVirtual: (lat: number, lng: number, y?: number) => { x: number; y: number; z: number },
    terrainData: TerrainData
  ): Promise<void> {
    // 四川盆地特征：周围山地，中间平原
    const surroundingMountains: MountainConfig[] = [
      {
        name: '青城山',
        position: toVirtual(30.9, 103.55, 80),
        height: 80,
        baseRadius: 40,
        hasSnowCap: false,
        color: '#689F38',
        roughness: 0.6,
      },
    ];

    for (const config of surroundingMountains) {
      terrainData.hills.push(this.createMountainFeature(config));
    }

    // 岷江
    terrainData.rivers.push(this.createRiverFeature({
      name: '岷江',
      path: [
        toVirtual(30.8, 103.6),
        toVirtual(30.7, 103.8),
        toVirtual(30.6, 104.0),
        toVirtual(30.4, 104.2),
      ],
      width: 15,
      depth: 3,
      color: '#03A9F4',
      transparency: 0.55,
    }));
  }

  /**
   * 生成西安地形
   */
  private async generateXianTerrain(
    toVirtual: (lat: number, lng: number, y?: number) => { x: number; y: number; z: number },
    terrainData: TerrainData
  ): Promise<void> {
    // 秦岭山脉
    const qinlingMountains: MountainConfig[] = [
      {
        name: '太白山',
        position: toVirtual(34.0, 107.8, 200),
        height: 200,
        baseRadius: 100,
        hasSnowCap: true,
        snowCapHeight: 80,
        color: '#6B4423',
        snowColor: '#FFFFFF',
        roughness: 0.85,
      },
      {
        name: '翠华山',
        position: toVirtual(34.05, 109.0, 120),
        height: 120,
        baseRadius: 50,
        hasSnowCap: false,
        color: '#7B5A3A',
        roughness: 0.7,
      },
    ];

    for (const config of qinlingMountains) {
      terrainData.mountains.push(this.createMountainFeature(config));
    }

    // 渭河
    terrainData.rivers.push(this.createRiverFeature({
      name: '渭河',
      path: [
        toVirtual(34.5, 107.0),
        toVirtual(34.4, 108.5),
        toVirtual(34.35, 109.2),
        toVirtual(34.3, 110.0),
      ],
      width: 20,
      depth: 3,
      color: '#29B6F6',
      transparency: 0.55,
    }));
  }

  /**
   * 生成默认城市地形
   */
  private async generateDefaultCityTerrain(
    toVirtual: (lat: number, lng: number, y?: number) => { x: number; y: number; z: number },
    terrainData: TerrainData
  ): Promise<void> {
    // 默认生成少量丘陵和水系
    terrainData.hills.push(this.createMountainFeature({
      name: '城市郊外山丘',
      position: toVirtual(0, 0, 50),
      height: 50,
      baseRadius: 30,
      hasSnowCap: false,
      color: '#8BC34A',
      roughness: 0.5,
    }));
  }

  /**
   * 生成程序化地形
   */
  private async generateProceduralTerrain(
    city: CityConfig,
    terrainData: TerrainData
  ): Promise<void> {
    // 程序化生成随机地形
    logger.info(`Generating procedural terrain for ${city.name}`);

    const toVirtual = (lat: number, lng: number, y: number = 0) => {
      const meters = latLngToMeters(lat, lng, city.center.lat, city.center.lng);
      return {
        x: meters.x + city.virtualCenterX,
        y,
        z: meters.z + city.virtualCenterZ,
      };
    };

    // 生成一些随机山丘
    for (let i = 0; i < 5; i++) {
      const lat = city.bounds.minLat + Math.random() * (city.bounds.maxLat - city.bounds.minLat);
      const lng = city.bounds.minLng + Math.random() * (city.bounds.maxLng - city.bounds.minLng);

      terrainData.hills.push(this.createMountainFeature({
        name: `山丘${i + 1}`,
        position: toVirtual(lat, lng, 40 + Math.random() * 60),
        height: 40 + Math.random() * 60,
        baseRadius: 20 + Math.random() * 40,
        hasSnowCap: Math.random() > 0.7,
        color: '#8BC34A',
        roughness: 0.5 + Math.random() * 0.3,
      }));
    }

    // 生成一条河流
    const riverPath: { x: number; y: number; z: number }[] = [];
    for (let i = 0; i < 5; i++) {
      const lat = city.bounds.minLat + (i / 4) * (city.bounds.maxLat - city.bounds.minLat);
      const lng = city.bounds.minLng + Math.random() * (city.bounds.maxLng - city.bounds.minLng);
      riverPath.push(toVirtual(lat, lng));
    }

    terrainData.rivers.push(this.createRiverFeature({
      name: '城市河流',
      path: riverPath,
      width: 15,
      depth: 3,
      color: '#29B6F6',
      transparency: 0.6,
    }));
  }

  /**
   * 创建山脉特征对象
   */
  private createMountainFeature(config: MountainConfig): TerrainFeature {
    return {
      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      feature_id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: config.height > 150 ? 'mountain' : 'hill',
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
  }

  /**
   * 创建河流特征对象
   */
  private createRiverFeature(config: RiverConfig): TerrainFeature {
    // 计算边界
    const allX = config.path.map(p => p.x);
    const allZ = config.path.map(p => p.z);

    return {
      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      feature_id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'river',
      name: config.name,
      position: {
        x: (Math.min(...allX) + Math.max(...allX)) / 2,
        y: 0,
        z: (Math.min(...allZ) + Math.max(...allZ)) / 2,
      },
      size: {
        width: Math.max(...allX) - Math.min(...allX) + config.width,
        height: config.depth,
        depth: Math.max(...allZ) - Math.min(...allZ) + config.width,
      },
      metadata: {
        path: config.path,
        width: config.width,
        depth: config.depth,
        color: config.color,
        transparency: config.transparency,
      },
    };
  }

  /**
   * 创建水域特征对象
   */
  private createWaterFeature(config: {
    name: string;
    position: { x: number; y: number; z: number };
    size: { width: number; height: number; depth: number };
    color: string;
    transparency: number;
  }): TerrainFeature {
    return {
      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      feature_id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'water',
      name: config.name,
      position: config.position,
      size: config.size,
      metadata: {
        color: config.color,
        transparency: config.transparency,
      },
    };
  }

  /**
   * 缓存城市地形到数据库
   */
  private async cacheCityTerrain(cityId: string, terrainData: TerrainData): Promise<void> {
    try {
      const db = getDatabase();

      // 确保城市记录存在
      const city = terrainData.city;
      if (!city) return;

      await db.city.upsert({
        where: { city_id: cityId },
        create: {
          city_id: cityId,
          name: city.name,
          name_en: city.nameEn,
          country: city.country,
          province: city.province,
          min_lat: city.bounds.minLat,
          max_lat: city.bounds.maxLat,
          min_lng: city.bounds.minLng,
          max_lng: city.bounds.maxLng,
          center_lat: city.center.lat,
          center_lng: city.center.lng,
          virtual_scale: city.virtualScale,
          virtual_center_x: city.virtualCenterX,
          virtual_center_z: city.virtualCenterZ,
          elevation_api: city.elevationApi,
          terrain_source: city.terrainSource,
          terrain_cached: true,
          terrain_cache_date: new Date(),
        },
        update: {
          terrain_cached: true,
          terrain_cache_date: new Date(),
        },
      });

      // 删除旧的缓存特征
      await db.terrainFeature.deleteMany({
        where: { city_id: cityId },
      });

      // 存储地形特征到数据库
      const allFeatures = [
        ...terrainData.mountains.map(f => ({ ...f, type: 'mountain' })),
        ...terrainData.hills.map(f => ({ ...f, type: 'hill' })),
        ...terrainData.rivers.map(f => ({ ...f, type: 'river' })),
        ...terrainData.plains.map(f => ({ ...f, type: 'plain' })),
        ...terrainData.waters.map(f => ({ ...f, type: 'water' })),
      ];

      for (const feature of allFeatures) {
        await db.terrainFeature.create({
          data: {
            feature_id: feature.feature_id,
            type: feature.type,
            name: feature.name,
            position: feature.position,
            size: feature.size,
            real_coordinates: feature.realCoordinates,
            metadata: feature.metadata,
            city_id: cityId,
          },
        });
      }

      logger.info(`Cached terrain data for city ${city.name} with ${allFeatures.length} features`);
    } catch (error) {
      logger.error(`Failed to cache city terrain:`, error);
    }
  }

  /**
   * 将数据库地形特征转换为 TerrainData
   */
  private dbFeaturesToTerrainData(
    features: any[],
    city: CityConfig | null
  ): TerrainData {
    const terrainData: TerrainData = {
      city,
      mountains: [],
      hills: [],
      rivers: [],
      plains: [],
      waters: [],
    };

    for (const feature of features) {
      const terrainFeature: TerrainFeature = {
        id: feature.id,
        feature_id: feature.feature_id,
        type: feature.type as TerrainType,
        name: feature.name || undefined,
        position: feature.position as { x: number; y: number; z: number },
        size: feature.size as { width: number; height: number; depth: number },
        realCoordinates: feature.real_coordinates as { lat: number; lng: number } | undefined,
        metadata: feature.metadata as Record<string, unknown> | undefined,
      };

      switch (feature.type) {
        case 'mountain':
          terrainData.mountains.push(terrainFeature);
          break;
        case 'hill':
          terrainData.hills.push(terrainFeature);
          break;
        case 'river':
          terrainData.rivers.push(terrainFeature);
          break;
        case 'plain':
          terrainData.plains.push(terrainFeature);
          break;
        case 'water':
        case 'ocean':
          terrainData.waters.push(terrainFeature);
          break;
      }
    }

    return terrainData;
  }

  /**
   * 获取默认地形（当没有找到城市时）
   */
  private getDefaultTerrain(): TerrainData {
    return {
      city: null,
      mountains: [],
      hills: [],
      rivers: [],
      plains: [],
      waters: [],
    };
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cityCache.clear();
    this.initializationPromises.clear();
    logger.info('City terrain cache cleared');
  }

  /**
   * 获取已缓存的城市列表
   */
  getCachedCities(): string[] {
    return Array.from(this.cityCache.keys());
  }

  /**
   * 强制重新生成指定城市的地形数据
   */
  async regenerateTerrain(cityName: string): Promise<TerrainData> {
    const cityConfig = getCityConfig(cityName);
    if (!cityConfig) {
      logger.warn(`City config not found for ${cityName}`);
      return this.getDefaultTerrain();
    }

    const cityKey = cityName.toLowerCase().replace(/市$/, '');

    // 清除缓存
    this.cityCache.delete(cityKey);
    this.initializationPromises.delete(cityKey);

    // 强制重新生成
    const terrainData = await this.loadCityTerrain(cityConfig, true);
    this.cityCache.set(cityKey, terrainData);

    logger.info(`Regenerated terrain for ${cityName}`);
    return terrainData;
  }
}

// 导出单例实例
export const cityTerrainSystem = new CityTerrainSystem();
