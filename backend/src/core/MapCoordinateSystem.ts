// 地图坐标映射系统 - 将真实北京坐标映射到虚拟3D空间

import { GeoCoordinates, Vector3D } from '../types/terrain';

/**
 * 北京地图配置
 */
const BEIJING_CONFIG = {
  // 真实地理坐标范围
  realBounds: {
    minLat: 39.4,   // 南部边界
    maxLat: 41.05,  // 北部边界（燕山山脉）
    minLng: 115.4,  // 西部边界（太行山脉）
    maxLng: 117.5,  // 东部边界
  },
  // 中心点（天安门广场）
  centerPoint: {
    lat: 39.9042,
    lng: 116.4074,
  },
  // 虚拟3D空间配置
  virtualMap: {
    size: 1000,     // 总尺寸（单位）
    halfSize: 500,  // 半尺寸（-500 到 +500）
  },
} as const;

/**
 * 坐标映射结果
 */
export interface CoordinateMapping {
  virtual: Vector3D;
  real: GeoCoordinates;
  isValid: boolean;
}

/**
 * 缩放级别配置
 */
export interface ZoomLevel {
  scale: number;
  name: string;
  description: string;
}

/**
 * 预定义的缩放级别
 */
export const ZOOM_LEVELS: Record<string, ZoomLevel> = {
  city: {
    scale: 1.0,
    name: '城市全景',
    description: '显示整个北京市区',
  },
  district: {
    scale: 2.0,
    name: '区域视图',
    description: '显示单个区域',
  },
  neighborhood: {
    scale: 5.0,
    name: '街区视图',
    description: '显示街道级别',
  },
  detail: {
    scale: 10.0,
    name: '详细视图',
    description: '显示建筑物级别',
  },
};

/**
 * 北京著名地标坐标
 */
export const BEIJING_LANDMARKS: Record<string, GeoCoordinates> = {
  tiananmen: { lat: 39.9042, lng: 116.4074 },
  forbidden_city: { lat: 39.9163, lng: 116.3972 },
  temple_of_heaven: { lat: 39.8822, lng: 116.4066 },
  summer_palace: { lat: 40.0005, lng: 116.2734 },
  olympic_park: { lat: 39.9929, lng: 116.3967 },
  cbd: { lat: 39.9088, lng: 116.4856 },
  wangfujing: { lat: 39.9097, lng: 116.4106 },
  sanlitun: { lat: 39.9368, lng: 116.4555 },
  beijing_railway: { lat: 39.9044, lng: 116.4272 },
  beijing_south: { lat: 39.8648, lng: 116.3783 },
  beijing_west: { lat: 39.8936, lng: 116.3225 },
  capital_airport: { lat: 40.0799, lng: 116.6031 },
  daxing_airport: { lat: 39.5098, lng: 116.4107 },
};

/**
 * 北京区县中心坐标
 */
export const BEIJING_DISTRICTS: Record<string, GeoCoordinates> = {
  dongcheng: { lat: 39.9289, lng: 116.4169 },
  xicheng: { lat: 39.9139, lng: 116.3661 },
  chaoyang: { lat: 39.9439, lng: 116.4435 },
  haidian: { lat: 39.9593, lng: 116.2985 },
  fengtai: { lat: 39.8583, lng: 116.2873 },
  shijingshan: { lat: 39.9064, lng: 116.2225 },
  mentougou: { lat: 39.9371, lng: 116.1058 },
  fangshan: { lat: 39.7351, lng: 115.9826 },
  tongzhou: { lat: 39.9092, lng: 116.6572 },
  shunyi: { lat: 40.1302, lng: 116.6544 },
  changping: { lat: 40.2199, lng: 116.2314 },
  daxing: { lat: 39.7267, lng: 116.3380 },
  huairou: { lat: 40.3719, lng: 116.6322 },
  pinggu: { lat: 40.1404, lng: 117.1215 },
  miyun: { lat: 40.3769, lng: 116.8430 },
  yanqing: { lat: 40.4558, lng: 115.9747 },
};

/**
 * 地图坐标映射系统类
 */
export class MapCoordinateSystem {
  private config = BEIJING_CONFIG;
  private currentZoom: ZoomLevel = ZOOM_LEVELS.city;

  /**
   * 将真实地理坐标转换为虚拟3D坐标
   * @param lat 纬度
   * @param lng 经度
   * @param y 高度（可选，默认为0）
   * @returns 虚拟3D坐标
   */
  realToVirtual(lat: number, lng: number, y: number = 0): Vector3D {
    // 计算相对于中心点的偏移
    const latOffset = lat - this.config.centerPoint.lat;
    const lngOffset = lng - this.config.centerPoint.lng;

    // 纬度每度约等于111km，经度每度约等于111km * cos(纬度)
    const latDegreesToUnits = 111000 / this.config.virtualMap.size; // 米/单位
    const lngDegreesToUnits = 111000 * Math.cos(this.config.centerPoint.lat * Math.PI / 180) / this.config.virtualMap.size;

    // 应用缩放级别
    const scale = this.currentZoom.scale;

    return {
      x: (lngOffset / lngDegreesToUnits) * scale,
      y: y,
      z: -(latOffset / latDegreesToUnits) * scale, // Z轴负方向为北
    };
  }

  /**
   * 将虚拟3D坐标转换为真实地理坐标
   * @param x 虚拟X坐标
   * @param z 虚拟Z坐标
   * @returns 真实地理坐标
   */
  virtualToReal(x: number, z: number): GeoCoordinates {
    const scale = this.currentZoom.scale;

    // 纬度每度约等于111km，经度每度约等于111km * cos(纬度)
    const latDegreesToUnits = 111000 / this.config.virtualMap.size;
    const lngDegreesToUnits = 111000 * Math.cos(this.config.centerPoint.lat * Math.PI / 180) / this.config.virtualMap.size;

    // 计算偏移
    const lngOffset = (x / scale) * lngDegreesToUnits;
    const latOffset = -(z / scale) * latDegreesToUnits; // Z轴负方向为北

    return {
      lat: this.config.centerPoint.lat + latOffset,
      lng: this.config.centerPoint.lng + lngOffset,
    };
  }

  /**
   * 验证坐标是否在有效范围内
   */
  isValidCoordinate(lat: number, lng: number): boolean {
    return (
      lat >= this.config.realBounds.minLat &&
      lat <= this.config.realBounds.maxLat &&
      lng >= this.config.realBounds.minLng &&
      lng <= this.config.realBounds.maxLng
    );
  }

  /**
   * 设置缩放级别
   */
  setZoomLevel(levelName: string): void {
    const level = ZOOM_LEVELS[levelName];
    if (level) {
      this.currentZoom = level;
    }
  }

  /**
   * 获取当前缩放级别
   */
  getZoomLevel(): ZoomLevel {
    return this.currentZoom;
  }

  /**
   * 计算两个虚拟坐标之间的距离（单位）
   */
  calculateDistance(from: Vector3D, to: Vector3D): number {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dz = to.z - from.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * 计算两个真实地理坐标之间的距离（米）
   */
  calculateRealDistance(from: GeoCoordinates, to: GeoCoordinates): number {
    const R = 6371000; // 地球半径（米）
    const lat1Rad = from.lat * Math.PI / 180;
    const lat2Rad = to.lat * Math.PI / 180;
    const deltaLat = (to.lat - from.lat) * Math.PI / 180;
    const deltaLng = (to.lng - from.lng) * Math.PI / 180;

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * 根据地标名称获取虚拟坐标
   */
  getLandmarkVirtualPosition(landmark: keyof typeof BEIJING_LANDMARKS): Vector3D | null {
    const coords = BEIJING_LANDMARKS[landmark];
    if (!coords) return null;

    return this.realToVirtual(coords.lat, coords.lng);
  }

  /**
   * 根据区县名称获取虚拟坐标
   */
  getDistrictVirtualPosition(district: keyof typeof BEIJING_DISTRICTS): Vector3D | null {
    const coords = BEIJING_DISTRICTS[district];
    if (!coords) return null;

    return this.realToVirtual(coords.lat, coords.lng);
  }

  /**
   * 获取配置信息
   */
  getConfig() {
    return {
      realBounds: this.config.realBounds,
      centerPoint: this.config.centerPoint,
      virtualMap: this.config.virtualMap,
    };
  }

  /**
   * 批量转换地标坐标
   */
  batchConvertLandmarks(landmarks: string[]): Record<string, Vector3D> {
    const result: Record<string, Vector3D> = {};

    for (const landmark of landmarks) {
      const position = this.getLandmarkVirtualPosition(landmark as keyof typeof BEIJING_LANDMARKS);
      if (position) {
        result[landmark] = position;
      }
    }

    return result;
  }

  /**
   * 计算虚拟坐标的边界框
   */
  getVirtualBounds(): { min: Vector3D; max: Vector3D } {
    const minLat = this.config.realBounds.minLat;
    const maxLat = this.config.realBounds.maxLat;
    const minLng = this.config.realBounds.minLng;
    const maxLng = this.config.realBounds.maxLng;

    const min = this.realToVirtual(minLat, minLng);
    const max = this.realToVirtual(maxLat, maxLng);

    return { min, max };
  }

  /**
   * 判断虚拟坐标是否在地图范围内
   */
  isVirtualInBounds(position: Vector3D): boolean {
    const bounds = this.getVirtualBounds();
    return (
      position.x >= bounds.min.x &&
      position.x <= bounds.max.x &&
      position.z >= bounds.min.z &&
      position.z <= bounds.max.z
    );
  }
}

// 导出单例实例
export const mapCoordinateSystem = new MapCoordinateSystem();
