/**
 * 城市生成器 - 基于真实城市规划规则
 */

import { Vector3 } from 'three';

export interface CityZone {
  id: string;
  type: 'residential' | 'commercial' | 'industrial';
  center: Vector3;
  radius: number;
}

export interface BuildingData {
  id: string;
  position: { x: number; y: number; z: number };
  size: { width: number; depth: number; height: number };
  color: number;
  type: 'residential' | 'commercial' | 'industrial';
}

export interface CityGeneratorConfig {
  mapSize: number;
  residentialRatio: number;
  commercialRatio: number;
  industrialRatio: number;
}

/**
 * 基于城市规划规则生成城市布局
 * - 商业区集中在主干道交汇处
 * - 住宅区远离主干道，有安静巷弄
 * - 工业区在城市边缘，有货运通道
 */
export class CityGenerator {
  private config: CityGeneratorConfig;
  private zones: CityZone[] = [];
  private roadNetwork: Array<{ start: Vector3; end: Vector3; width: number }> = [];

  constructor(config: CityGeneratorConfig) {
    this.config = config;
  }

  /**
   * 生成完整的城市布局
   */
  generateCity(): {
    buildings: BuildingData[];
    zones: CityZone[];
    roads: Array<{ start: Vector3; end: Vector3; width: number }>;
  } {
    // 1. 生成区域划分
    this.generateZones();

    // 2. 生成道路网络
    this.generateRoadNetwork();

    // 3. 在区域内生成建筑
    const buildings = this.generateBuildings();

    return {
      buildings,
      zones: this.zones,
      roads: this.roadNetwork,
    };
  }

  /**
   * 生成城市区域
   */
  private generateZones(): void {
    const { mapSize } = this.config;
    const center = new Vector3(0, 0, 0);

    // 商业区 - 城市中心
    this.zones.push({
      id: 'downtown',
      type: 'commercial',
      center,
      radius: mapSize * 0.25,
    });

    // 住宅区 - 环绕商业区
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const distance = mapSize * 0.4;
      this.zones.push({
        id: `residential-${i}`,
        type: 'residential',
        center: new Vector3(
          Math.cos(angle) * distance,
          0,
          Math.sin(angle) * distance
        ),
        radius: mapSize * 0.2,
      });
    }

    // 工业区 - 城市边缘
    for (let i = 0; i < 2; i++) {
      const angle = (i / 2) * Math.PI * 2 + Math.PI / 4;
      const distance = mapSize * 0.65;
      this.zones.push({
        id: `industrial-${i}`,
        type: 'industrial',
        center: new Vector3(
          Math.cos(angle) * distance,
          0,
          Math.sin(angle) * distance
        ),
        radius: mapSize * 0.15,
      });
    }
  }

  /**
   * 生成道路网络
   */
  private generateRoadNetwork(): void {
    const { mapSize } = this.config;
    const center = new Vector3(0, 0, 0);

    // 主干道 - 十字形
    this.roadNetwork.push(
      { start: new Vector3(-mapSize, 0, 0), end: new Vector3(mapSize, 0, 0), width: 20 },
      { start: new Vector3(0, 0, -mapSize), end: new Vector3(0, 0, mapSize), width: 20 }
    );

    // 环路
    this.roadNetwork.push({
      start: new Vector3(-mapSize * 0.4, 0, 0),
      end: new Vector3(mapSize * 0.4, 0, 0),
      width: 15,
    });

    // 次要道路 - 连接各区域
    this.zones.forEach(zone => {
      const fromCenter = zone.center.clone().sub(center).normalize().multiplyScalar(30);
      this.roadNetwork.push({
        start: center.clone().add(fromCenter),
        end: zone.center.clone().sub(fromCenter.normalize().multiplyScalar(30)),
        width: 10,
      });
    });
  }

  /**
   * 在区域内生成建筑
   */
  private generateBuildings(): BuildingData[] {
    const buildings: BuildingData[] = [];
    let buildingId = 0;

    this.zones.forEach(zone => {
      const buildingCount = this.getBuildingCountForZone(zone);

      for (let i = 0; i < buildingCount; i++) {
        // 在区域内随机位置
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * zone.radius * 0.8;
        const position = {
          x: zone.center.x + Math.cos(angle) * distance,
          y: 0,
          z: zone.center.z + Math.sin(angle) * distance,
        };

        // 根据类型确定建筑特征
        const { width, depth, height } = this.getBuildingSizeForType(zone.type);
        const size = {
          width: width * (0.8 + Math.random() * 0.4),
          depth: depth * (0.8 + Math.random() * 0.4),
          height: height * (0.7 + Math.random() * 0.6),
        };

        const color = this.getBuildingColorForType(zone.type);

        buildings.push({
          id: `building-${buildingId++}`,
          position,
          size,
          color,
          type: zone.type,
        });
      }
    });

    return buildings;
  }

  private getBuildingCountForZone(zone: CityZone): number {
    const density = {
      commercial: 100,
      residential: 50,
      industrial: 30,
    };
    return Math.floor(density[zone.type] * (zone.radius / 50));
  }

  private getBuildingSizeForType(type: CityZone['type']): {
    width: number;
    depth: number;
    height: number;
  } {
    const sizes = {
      residential: { width: 8, depth: 8, height: 20 },
      commercial: { width: 15, depth: 15, height: 60 },
      industrial: { width: 25, depth: 20, height: 15 },
    };
    return sizes[type];
  }

  private getBuildingColorForType(type: CityZone['type']): number {
    const colors = {
      residential: 0x4a90d9,
      commercial: 0xd94a4a,
      industrial: 0x6b6b6b,
    };
    return colors[type];
  }
}

/**
 * 创建城市数据的工厂函数
 */
export function generateCity(config: Partial<CityGeneratorConfig> = {}): {
  buildings: BuildingData[];
  zones: CityZone[];
  roads: Array<{ start: Vector3; end: Vector3; width: number }>;
} {
  const defaultConfig: CityGeneratorConfig = {
    mapSize: 500,
    residentialRatio: 0.5,
    commercialRatio: 0.3,
    industrialRatio: 0.2,
  };

  const generator = new CityGenerator({ ...defaultConfig, ...config });
  return generator.generateCity();
}
