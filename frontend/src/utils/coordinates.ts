/**
 * 统一的坐标转换工具 - 1:1比例映射
 * 确保前端和后端使用完全相同的坐标转换逻辑
 *
 * 1虚拟单位 = 1米
 */

/**
 * 地理坐标
 */
export interface GeoCoordinates {
  lat: number;
  lng: number;
}

/**
 * 3D虚拟坐标（单位：米）
 */
export interface VirtualCoordinates {
  x: number;  // 东向偏移（米）
  y: number;  // 高度（米）
  z: number;  // 北向偏移（米，负值表示向北）
}

/**
 * 城市边界配置
 */
export interface CityBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/**
 * 城市中心点
 */
export interface CityCenter {
  lat: number;
  lng: number;
}

/**
 * 城市配置
 */
export interface CityConfig {
  id: string;
  name: string;
  nameEn: string;
  country: string;
  province?: string;
  center: CityCenter;
  bounds: CityBounds;
  virtualScale: number;  // 应该始终为 1.0 (1:1比例)
  virtualCenterX: number;
  virtualCenterZ: number;
}

/**
 * 将真实地理坐标转换为虚拟3D坐标（1:1比例）
 *
 * @param lat 目标点纬度
 * @param lng 目标点经度
 * @param centerLat 中心点纬度（城市中心）
 * @param centerLng 中心点经度（城市中心）
 * @param y 高度（米），默认为0
 * @returns 虚拟3D坐标（单位：米）
 *
 * @example
 * // 北京天安门 (39.9042, 116.4074) 相对于北京中心的坐标
 * const pos = latLngToMeters(39.9042, 116.4074, 39.9042, 116.4074);
 * // 返回: { x: 0, z: 0 }
 *
 * // 北京CBD (39.9088, 116.4856) 相对于天安门的坐标
 * const cbd = latLngToMeters(39.9088, 116.4856, 39.9042, 116.4074);
 * // 大约: { x: 6800, z: -507 } (CBD在天安门东约6.8km，北约0.5km)
 */
export function latLngToMeters(
  lat: number,
  lng: number,
  centerLat: number,
  centerLng: number
): { x: number; z: number } {
  // 纬度每度约 111km (在纬度 45° 处)
  const latMeters = (lat - centerLat) * 111000;

  // 经度每度约 111km * cos(纬度)
  // 使用中心纬度计算cos值，确保转换精度
  const lngMeters = (lng - centerLng) * 111000 * Math.cos(centerLat * Math.PI / 180);

  return { x: lngMeters, z: -latMeters }; // x向东, z向北(负)
}

/**
 * 将虚拟3D坐标转换为真实地理坐标（1:1比例）
 *
 * @param x 东向偏移（米）
 * @param z 北向偏移（米，负值表示向北）
 * @param centerLat 中心点纬度
 * @param centerLng 中心点经度
 * @returns 地理坐标
 */
export function metersToLatLng(
  x: number,
  z: number,
  centerLat: number,
  centerLng: number
): { lat: number; lng: number } {
  const latMeters = -z;
  const lngMeters = x;

  const lat = centerLat + latMeters / 111000;
  const lng = centerLng + lngMeters / (111000 * Math.cos(centerLat * Math.PI / 180));

  return { lat, lng };
}

/**
 * 计算两个地理坐标之间的距离（米）
 * 使用 Haversine 公式计算大圆距离
 *
 * @param from 起点坐标
 * @param to 终点坐标
 * @returns 距离（米）
 */
export function calculateRealDistance(
  from: GeoCoordinates,
  to: GeoCoordinates
): number {
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
 * 计算城市虚拟空间的实际尺寸（米）
 * 基于城市的地理边界计算
 *
 * @param bounds 城市边界
 * @returns { width, depth } 单位：米
 */
export function calculateVirtualSize(bounds: CityBounds): { width: number; depth: number } {
  const centerLat = (bounds.minLat + bounds.maxLat) / 2;

  // 纬度跨度（米）
  const latSpan = (bounds.maxLat - bounds.minLat) * 111000;

  // 经度跨度（米）
  const lngSpan = (bounds.maxLng - bounds.minLng) * 111000 * Math.cos(centerLat * Math.PI / 180);

  return { width: lngSpan, depth: latSpan };
}

/**
 * 验证坐标是否在城市边界内
 *
 * @param lat 纬度
 * @param lng 经度
 * @param bounds 城市边界
 * @returns 是否在边界内
 */
export function isValidCoordinate(
  lat: number,
  lng: number,
  bounds: CityBounds
): boolean {
  return (
    lat >= bounds.minLat &&
    lat <= bounds.maxLat &&
    lng >= bounds.minLng &&
    lng <= bounds.maxLng
  );
}

/**
 * 虚拟坐标转换类
 * 封装城市相关的坐标转换逻辑
 */
export class CoordinateConverter {
  private city: CityConfig;

  constructor(city: CityConfig) {
    this.city = city;
  }

  /**
   * 将地理坐标转换为虚拟坐标
   */
  realToVirtual(lat: number, lng: number, y: number = 0): VirtualCoordinates {
    const meters = latLngToMeters(lat, lng, this.city.center.lat, this.city.center.lng);
    return {
      x: meters.x + this.city.virtualCenterX,
      y: y,
      z: meters.z + this.city.virtualCenterZ,
    };
  }

  /**
   * 将虚拟坐标转换为地理坐标
   */
  virtualToReal(x: number, z: number): GeoCoordinates {
    const relativeX = x - this.city.virtualCenterX;
    const relativeZ = z - this.city.virtualCenterZ;
    return metersToLatLng(relativeX, relativeZ, this.city.center.lat, this.city.center.lng);
  }

  /**
   * 验证地理坐标是否在城市范围内
   */
  isValid(lat: number, lng: number): boolean {
    return isValidCoordinate(lat, lng, this.city.bounds);
  }

  /**
   * 获取城市虚拟空间尺寸（米）
   */
  getVirtualSize(): { width: number; depth: number } {
    return calculateVirtualSize(this.city.bounds);
  }

  /**
   * 获取城市配置
   */
  getCityConfig(): CityConfig {
    return this.city;
  }
}

/**
 * 中国主要城市配置（与后端保持一致）
 */
export const CITIES_CONFIG: Record<string, CityConfig> = {
  beijing: {
    id: 'beijing',
    name: '北京',
    nameEn: 'Beijing',
    country: '中国',
    province: '北京市',
    center: { lat: 39.9042, lng: 116.4074 },
    bounds: {
      minLat: 39.4,
      maxLat: 41.05,
      minLng: 115.4,
      maxLng: 117.5
    },
    virtualScale: 1.0,
    virtualCenterX: 0,
    virtualCenterZ: 0,
  },

  shanghai: {
    id: 'shanghai',
    name: '上海',
    nameEn: 'Shanghai',
    country: '中国',
    province: '上海市',
    center: { lat: 31.2304, lng: 121.4737 },
    bounds: {
      minLat: 30.68,
      maxLat: 31.88,
      minLng: 120.86,
      maxLng: 122.24
    },
    virtualScale: 1.0,
    virtualCenterX: 0,
    virtualCenterZ: 0,
  },

  guangzhou: {
    id: 'guangzhou',
    name: '广州',
    nameEn: 'Guangzhou',
    country: '中国',
    province: '广东省',
    center: { lat: 23.1291, lng: 113.2644 },
    bounds: {
      minLat: 22.5,
      maxLat: 23.9,
      minLng: 112.9,
      maxLng: 114.6
    },
    virtualScale: 1.0,
    virtualCenterX: 0,
    virtualCenterZ: 0,
  },

  shenzhen: {
    id: 'shenzhen',
    name: '深圳',
    nameEn: 'Shenzhen',
    country: '中国',
    province: '广东省',
    center: { lat: 22.5431, lng: 114.0579 },
    bounds: {
      minLat: 22.45,
      maxLat: 22.86,
      minLng: 113.76,
      maxLng: 114.62
    },
    virtualScale: 1.0,
    virtualCenterX: 0,
    virtualCenterZ: 0,
  },

  hangzhou: {
    id: 'hangzhou',
    name: '杭州',
    nameEn: 'Hangzhou',
    country: '中国',
    province: '浙江省',
    center: { lat: 30.2741, lng: 120.1551 },
    bounds: {
      minLat: 29.5,
      maxLat: 30.6,
      minLng: 118.5,
      maxLng: 120.8
    },
    virtualScale: 1.0,
    virtualCenterX: 0,
    virtualCenterZ: 0,
  },

  chengdu: {
    id: 'chengdu',
    name: '成都',
    nameEn: 'Chengdu',
    country: '中国',
    province: '四川省',
    center: { lat: 30.5728, lng: 104.0668 },
    bounds: {
      minLat: 30.0,
      maxLat: 31.2,
      minLng: 103.5,
      maxLng: 104.9
    },
    virtualScale: 1.0,
    virtualCenterX: 0,
    virtualCenterZ: 0,
  },

  xian: {
    id: 'xian',
    name: '西安',
    nameEn: 'Xi\'an',
    country: '中国',
    province: '陕西省',
    center: { lat: 34.3416, lng: 108.9398 },
    bounds: {
      minLat: 33.7,
      maxLat: 34.9,
      minLng: 107.7,
      maxLng: 109.5
    },
    virtualScale: 1.0,
    virtualCenterX: 0,
    virtualCenterZ: 0,
  },
};

/**
 * 根据城市ID获取坐标转换器
 */
export function getConverter(cityId: string): CoordinateConverter | null {
  const cityConfig = CITIES_CONFIG[cityId];
  if (!cityConfig) {
    console.warn(`[CoordinateSystem] City config not found for: ${cityId}`);
    return null;
  }
  return new CoordinateConverter(cityConfig);
}

/**
 * 根据城市名称获取坐标转换器
 */
export function getConverterByName(cityName: string): CoordinateConverter | null {
  const normalizedKey = cityName.toLowerCase()
    .replace(/市$/, '')
    .replace(/\s+/g, '');

  for (const [id, config] of Object.entries(CITIES_CONFIG)) {
    if (id === normalizedKey || config.name === cityName || config.nameEn === cityName) {
      return new CoordinateConverter(config);
    }
  }

  console.warn(`[CoordinateSystem] City not found: ${cityName}`);
  return null;
}
