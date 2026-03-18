// 位置系统

import { createLogger } from '../utils/logger';
import { getDatabase } from '../services/database';
import { Location, LocationInfo } from '../types/world';

const logger = createLogger('LocationSystem');

export interface LocationConfig {
  id: string;
  name: string;
  description?: string;
  type: 'residential' | 'commercial' | 'office' | 'park' | 'entertainment';
  coordinates: { x: number; y: number; z: number };
  maxCapacity?: number;
  parentId?: string;
}

export class LocationSystem {
  private locations: Map<string, Location> = new Map();

  /**
   * 初始化位置系统
   */
  async initialize(): Promise<void> {
    await this.loadLocations();
    logger.info(`LocationSystem initialized with ${this.locations.size} locations`);
  }

  /**
   * 从数据库加载位置
   */
  private async loadLocations(): Promise<void> {
    const db = getDatabase();
    const locations = await db.location.findMany();

    for (const location of locations) {
      this.locations.set(location.location_id, location);
    }
  }

  /**
   * 获取位置信息
   */
  getLocation(locationId: string): Location | undefined {
    return this.locations.get(locationId);
  }

  /**
   * 获取所有位置
   */
  getAllLocations(): Location[] {
    return Array.from(this.locations.values());
  }

  /**
   * 按类型获取位置
   */
  getLocationsByType(type: Location['type']): Location[] {
    return Array.from(this.locations.values()).filter(loc => loc.type === type);
  }

  /**
   * 创建新位置
   */
  async createLocation(config: LocationConfig): Promise<Location> {
    const db = getDatabase();

    const location = await db.location.create({
      data: {
        location_id: config.id,
        name: config.name,
        description: config.description,
        type: config.type,
        coordinates: config.coordinates,
        max_capacity: config.maxCapacity,
        parent_location_id: config.parentId,
      },
    });

    this.locations.set(location.location_id, location);
    logger.info(`Created location: ${location.name} (${location.location_id})`);

    return location;
  }

  /**
   * 更新位置中的 Agent 数量
   */
  async updateAgentCount(locationId: string, delta: number): Promise<void> {
    const location = this.locations.get(locationId);
    if (!location) {
      logger.warn(`Location not found: ${locationId}`);
      return;
    }

    const newCount = Math.max(0, location.current_agents + delta);

    const db = getDatabase();
    await db.location.update({
      where: { id: location.id },
      data: { current_agents: newCount },
    });

    location.current_agents = newCount;
  }

  /**
   * 计算两个位置之间的距离
   */
  calculateDistance(fromId: string, toId: string): number {
    const from = this.locations.get(fromId);
    const to = this.locations.get(toId);

    if (!from || !to) {
      return Infinity;
    }

    const dx = to.coordinates.x - from.coordinates.x;
    const dy = to.coordinates.y - from.coordinates.y;
    const dz = to.coordinates.z - from.coordinates.z;

    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * 查找附近的位置
   */
  findNearbyLocations(locationId: string, radius: number): Location[] {
    const nearby: Location[] = [];

    for (const [id, location] of this.locations) {
      if (id === locationId) continue;

      const distance = this.calculateDistance(locationId, id);
      if (distance <= radius) {
        nearby.push(location);
      }
    }

    return nearby.sort((a, b) =>
      this.calculateDistance(locationId, a.location_id) -
      this.calculateDistance(locationId, b.location_id)
    );
  }

  /**
   * 获取位置摘要
   */
  getLocationSummary(locationId: string): LocationInfo | undefined {
    const location = this.locations.get(locationId);
    if (!location) {
      return undefined;
    }

    return {
      id: location.location_id,
      name: location.name,
      coordinates: location.coordinates,
      type: location.type,
    };
  }

  /**
   * 初始化默认位置
   */
  async initializeDefaultLocations(): Promise<void> {
    const defaults: LocationConfig[] = [
      {
        id: 'residential_sunshine',
        name: '阳光公寓',
        description: '舒适的经济型住宅区',
        type: 'residential',
        coordinates: { x: 100, y: 200, z: 0 },
        maxCapacity: 50,
      },
      {
        id: 'office_tech_park',
        name: '科技园区写字楼',
        description: '现代化的办公区域',
        type: 'office',
        coordinates: { x: 500, y: 300, z: 0 },
        maxCapacity: 100,
      },
      {
        id: 'commercial_mall',
        name: '中央购物中心',
        description: '繁华的商业区',
        type: 'commercial',
        coordinates: { x: 300, y: 400, z: 0 },
        maxCapacity: 200,
      },
      {
        id: 'park_central',
        name: '中央公园',
        description: '城市绿地，适合休闲',
        type: 'park',
        coordinates: { x: 200, y: 100, z: 0 },
        maxCapacity: 150,
      },
      {
        id: 'entertainment_cinema',
        name: '星光电影院',
        description: '享受最新电影',
        type: 'entertainment',
        coordinates: { x: 400, y: 350, z: 0 },
        maxCapacity: 80,
      },
    ];

    for (const config of defaults) {
      if (!this.locations.has(config.id)) {
        await this.createLocation(config);
      }
    }

    logger.info('Default locations initialized');
  }
}
