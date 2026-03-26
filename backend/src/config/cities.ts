/**
 * 中国主要城市配置
 * 用于城市级地图加载系统
 * 1:1比例配置: 1虚拟单位 = 1米
 */

export interface CityBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface CityCenter {
  lat: number;
  lng: number;
}

export interface CityDistrict {
  name: string;
  center: CityCenter;
}

export interface CityConfig {
  id: string;
  name: string;
  nameEn: string;
  country: string;
  province?: string;
  center: CityCenter;
  bounds: CityBounds;
  districts?: CityDistrict[];
  // 1:1比例配置
  virtualScale: number;
  virtualCenterX: number;
  virtualCenterZ: number;
  // 地形数据源
  elevationApi?: 'google' | 'opentopography' | 'open_elevation';
  terrainSource: 'generated' | 'real_data';
}

/**
 * 中国主要城市配置数据
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
    districts: [
      { name: '朝阳区', center: { lat: 39.9219, lng: 116.4436 } },
      { name: '海淀区', center: { lat: 39.9593, lng: 116.2985 } },
      { name: '东城区', center: { lat: 39.9289, lng: 116.4203 } },
      { name: '西城区', center: { lat: 39.9139, lng: 116.3668 } },
      { name: '丰台区', center: { lat: 39.8583, lng: 116.2871 } },
      { name: '石景山区', center: { lat: 39.9063, lng: 116.2229 } },
      { name: '通州区', center: { lat: 39.9095, lng: 116.6573 } },
      { name: '顺义区', center: { lat: 40.1302, lng: 116.6540 } },
    ],
    virtualScale: 1.0,
    virtualCenterX: 0,
    virtualCenterZ: 0,
    elevationApi: 'google',
    terrainSource: 'real_data',
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
    districts: [
      { name: '黄浦区', center: { lat: 31.2304, lng: 121.4737 } },
      { name: '浦东新区', center: { lat: 31.2204, lng: 121.5496 } },
      { name: '静安区', center: { lat: 31.2285, lng: 121.4472 } },
      { name: '徐汇区', center: { lat: 31.1880, lng: 121.4367 } },
      { name: '长宁区', center: { lat: 31.2203, lng: 121.4246 } },
      { name: '普陀区', center: { lat: 31.2500, lng: 121.3925 } },
      { name: '虹口区', center: { lat: 31.2653, lng: 121.5017 } },
      { name: '杨浦区', center: { lat: 31.2597, lng: 121.5254 } },
    ],
    virtualScale: 1.0,
    virtualCenterX: 0,
    virtualCenterZ: 0,
    elevationApi: 'google',
    terrainSource: 'real_data',
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
    districts: [
      { name: '天河区', center: { lat: 23.1291, lng: 113.2644 } },
      { name: '越秀区', center: { lat: 23.1297, lng: 113.2675 } },
      { name: '海珠区', center: { lat: 23.0837, lng: 113.3188 } },
      { name: '荔湾区', center: { lat: 23.1256, lng: 113.2421 } },
      { name: '白云区', center: { lat: 23.1819, lng: 113.2732 } },
      { name: '黄埔区', center: { lat: 23.1797, lng: 113.4583 } },
    ],
    virtualScale: 1.0,
    virtualCenterX: 0,
    virtualCenterZ: 0,
    elevationApi: 'google',
    terrainSource: 'real_data',
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
    districts: [
      { name: '福田区', center: { lat: 22.5431, lng: 114.0579 } },
      { name: '罗湖区', center: { lat: 22.5554, lng: 114.1312 } },
      { name: '南山区', center: { lat: 22.5311, lng: 113.9346 } },
      { name: '宝安区', center: { lat: 22.5536, lng: 113.8829 } },
      { name: '龙岗区', center: { lat: 22.7210, lng: 114.2743 } },
    ],
    virtualScale: 1.0,
    virtualCenterX: 0,
    virtualCenterZ: 0,
    elevationApi: 'google',
    terrainSource: 'real_data',
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
    districts: [
      { name: '西湖区', center: { lat: 30.2590, lng: 120.1296 } },
      { name: '上城区', center: { lat: 30.2741, lng: 120.1551 } },
      { name: '拱墅区', center: { lat: 30.3197, lng: 120.1642 } },
      { name: '滨江区', center: { lat: 30.2084, lng: 120.2118 } },
    ],
    virtualScale: 1.0,
    virtualCenterX: 0,
    virtualCenterZ: 0,
    elevationApi: 'google',
    terrainSource: 'real_data',
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
    districts: [
      { name: '锦江区', center: { lat: 30.6577, lng: 104.0815 } },
      { name: '青羊区', center: { lat: 30.6738, lng: 104.0454 } },
      { name: '金牛区', center: { lat: 30.6916, lng: 104.0647 } },
      { name: '武侯区', center: { lat: 30.6429, lng: 104.0432 } },
      { name: '成华区', center: { lat: 30.6586, lng: 104.1018 } },
    ],
    virtualScale: 1.0,
    virtualCenterX: 0,
    virtualCenterZ: 0,
    elevationApi: 'google',
    terrainSource: 'real_data',
  },

  wuhan: {
    id: 'wuhan',
    name: '武汉',
    nameEn: 'Wuhan',
    country: '中国',
    province: '湖北省',
    center: { lat: 30.5928, lng: 114.3055 },
    bounds: {
      minLat: 30.0,
      maxLat: 31.2,
      minLng: 113.7,
      maxLng: 115.1
    },
    districts: [
      { name: '江岸区', center: { lat: 30.5977, lng: 114.3094 } },
      { name: '江汉区', center: { lat: 30.5928, lng: 114.2709 } },
      { name: '武昌区', center: { lat: 30.5537, lng: 114.3564 } },
      { name: '洪山区', center: { lat: 30.5097, lng: 114.3974 } },
    ],
    virtualScale: 1.0,
    virtualCenterX: 0,
    virtualCenterZ: 0,
    elevationApi: 'google',
    terrainSource: 'real_data',
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
    districts: [
      { name: '新城区', center: { lat: 34.2666, lng: 108.9601 } },
      { name: '碑林区', center: { lat: 34.2383, lng: 108.9484 } },
      { name: '莲湖区', center: { lat: 34.2677, lng: 108.9364 } },
      { name: '雁塔区', center: { lat: 34.2224, lng: 108.9189 } },
    ],
    virtualScale: 1.0,
    virtualCenterX: 0,
    virtualCenterZ: 0,
    elevationApi: 'google',
    terrainSource: 'real_data',
  },

  nanjing: {
    id: 'nanjing',
    name: '南京',
    nameEn: 'Nanjing',
    country: '中国',
    province: '江苏省',
    center: { lat: 32.0603, lng: 118.7969 },
    bounds: {
      minLat: 31.5,
      maxLat: 32.6,
      minLng: 118.2,
      maxLng: 119.5
    },
    districts: [
      { name: '玄武区', center: { lat: 32.0486, lng: 118.7979 } },
      { name: '秦淮区', center: { lat: 32.0113, lng: 118.7983 } },
      { name: '鼓楼区', center: { lat: 32.0673, lng: 118.7715 } },
      { name: '建邺区', center: { lat: 32.0347, lng: 118.7381 } },
    ],
    virtualScale: 1.0,
    virtualCenterX: 0,
    virtualCenterZ: 0,
    elevationApi: 'google',
    terrainSource: 'real_data',
  },

  tianjin: {
    id: 'tianjin',
    name: '天津',
    nameEn: 'Tianjin',
    country: '中国',
    province: '天津市',
    center: { lat: 39.0842, lng: 117.2010 },
    bounds: {
      minLat: 38.5,
      maxLat: 40.2,
      minLng: 116.7,
      maxLng: 118.2
    },
    districts: [
      { name: '和平区', center: { lat: 39.1214, lng: 117.2150 } },
      { name: '河西区', center: { lat: 39.0996, lng: 117.2233 } },
      { name: '南开区', center: { lat: 39.1375, lng: 117.1682 } },
      { name: '河东区', center: { lat: 39.1227, lng: 117.2263 } },
    ],
    virtualScale: 1.0,
    virtualCenterX: 0,
    virtualCenterZ: 0,
    elevationApi: 'google',
    terrainSource: 'real_data',
  },
};

/**
 * 根据城市名称获取配置（支持中文名称）
 */
export function getCityConfig(cityName: string): CityConfig | null {
  // 标准化城市名称
  const normalizedKey = cityName.toLowerCase()
    .replace(/市$/, '')
    .replace(/\s+/g, '');

  // 首先尝试直接查找
  if (CITIES_CONFIG[normalizedKey]) {
    return CITIES_CONFIG[normalizedKey];
  }

  // 如果没找到，尝试通过中文名称匹配
  for (const [key, config] of Object.entries(CITIES_CONFIG)) {
    if (config.name === cityName || config.nameEn.toLowerCase() === normalizedKey) {
      return config;
    }
  }

  return null;
}

/**
 * 根据经纬度查找最近的城市
 */
export function findNearestCity(lat: number, lng: number): CityConfig | null {
  let nearestCity: CityConfig | null = null;
  let minDistance = Infinity;

  for (const city of Object.values(CITIES_CONFIG)) {
    const distance = Math.sqrt(
      Math.pow(lat - city.center.lat, 2) +
      Math.pow(lng - city.center.lng, 2)
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearestCity = city;
    }
  }

  // 返回最近的城市，即使距离较远
  return nearestCity;
}

/**
 * 获取所有城市列表
 */
export function getAllCities(): CityConfig[] {
  return Object.values(CITIES_CONFIG);
}

/**
 * 1:1比例配置常量
 */
export const SCALE_1_TO_1 = {
  metersPerUnit: 1,        // 1虚拟单位 = 1米
  unitsPerKilometer: 1000,  // 1公里 = 1000单位
} as const;

/**
 * 经纬度转换公式 (1:1比例)
 * 将真实地理坐标转换为虚拟3D坐标
 */
export function latLngToMeters(
  lat: number,
  lng: number,
  centerLat: number,
  centerLng: number
): { x: number; z: number } {
  // 纬度每度约111km
  const latMeters = (lat - centerLat) * 111000;
  // 经度每度约111km * cos(纬度)
  const lngMeters = (lng - centerLng) * 111000 * Math.cos(centerLat * Math.PI / 180);

  return { x: lngMeters, z: -latMeters }; // x向东, z向北(负)
}

/**
 * 虚拟3D坐标转换为经纬度
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
