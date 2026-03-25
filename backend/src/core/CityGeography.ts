// 城市地理数据系统 - 每个城市独立的真实地理数据

import { Vector3D, GeoCoordinates } from '../types/terrain';
import { mapCoordinateSystem } from './MapCoordinateSystem';
import { BeijingRoadDefinition } from '../types/road';
import { createLogger } from '../utils/logger';
import { RoadType } from '../types/road';

const logger = createLogger('CityGeography');

/**
 * 城市道路定义（简化版）
 */
export interface CityRoadDefinition {
  id: string;
  name: string;
  nameEn?: string;
  type: RoadType;
  realCoordinates: {
    start: { lat: number; lng: number };
    end: { lat: number; lng: number };
    waypoints?: { lat: number; lng: number }[];
  };
  lanes: number;
  width: number;
  speedLimit: number;
}

/**
 * 城市地标定义
 */
export interface CityLandmark {
  id: string;
  name: string;
  nameEn?: string;
  type: 'landmark' | 'building' | 'park' | 'transport';
  realCoordinates: GeoCoordinates;
  width: number;  // 真实宽度（米）
  depth: number;
  height: number;
  color: string;
  description?: string;
}

/**
 * 城市河流定义
 */
export interface CityRiver {
  id: string;
  name: string;
  nameEn?: string;
  path: GeoCoordinates[];  // 河流路径点
  width: number;  // 河流宽度（米）
}

/**
 * 城市地理数据
 */
export interface CityGeographyData {
  cityId: string;
  cityName: string;
  center: GeoCoordinates;
  bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
  roads: CityRoadDefinition[];
  landmarks: CityLandmark[];
  rivers: CityRiver[];
}

/**
 * 各城市地理数据定义
 */
export const CITIES_GEOGRAPHY: Record<string, CityGeographyData> = {
  // 北京
  beijing: {
    cityId: 'beijing',
    cityName: '北京市',
    center: { lat: 39.9042, lng: 116.4074 },
    bounds: {
      minLat: 39.4,
      maxLat: 40.5,
      minLng: 115.7,
      maxLng: 117.0,
    },
    roads: [
      // 主干道
      {
        id: 'beijing_changan_ave',
        name: '长安街',
        nameEn: "Chang'an Avenue",
        type: 'main_road',
        realCoordinates: {
          start: { lat: 39.9042, lng: 116.3274 },
          end: { lat: 39.9042, lng: 116.4874 },
        },
        lanes: 8,
        width: 40,
        speedLimit: 60,
      },
      {
        id: 'beijing_central_axis',
        name: '中轴线',
        nameEn: 'Central Axis',
        type: 'main_road',
        realCoordinates: {
          start: { lat: 39.8542, lng: 116.4074 },
          end: { lat: 40.0042, lng: 116.4074 },
        },
        lanes: 6,
        width: 35,
        speedLimit: 60,
      },
      {
        id: 'beijing_2nd_ring',
        name: '二环路',
        nameEn: '2nd Ring Road',
        type: 'ring_road',
        realCoordinates: {
          start: { lat: 39.85, lng: 116.35 },
          end: { lat: 39.96, lng: 116.47 },
        },
        lanes: 6,
        width: 30,
        speedLimit: 80,
      },
      {
        id: 'beijing_3rd_ring',
        name: '三环路',
        nameEn: '3rd Ring Road',
        type: 'ring_road',
        realCoordinates: {
          start: { lat: 39.82, lng: 116.30 },
          end: { lat: 39.98, lng: 116.52 },
        },
        lanes: 6,
        width: 32,
        speedLimit: 100,
      },
      {
        id: 'beijing_changping_road',
        name: '京藏高速',
        nameEn: 'Jingzang Expressway',
        type: 'highway',
        realCoordinates: {
          start: { lat: 39.9042, lng: 116.4074 },
          end: { lat: 40.22, lng: 116.23 },
        },
        lanes: 4,
        width: 30,
        speedLimit: 120,
      },
      {
        id: 'beijing_airport_road',
        name: '机场高速',
        nameEn: 'Airport Expressway',
        type: 'highway',
        realCoordinates: {
          start: { lat: 39.9342, lng: 116.4274 },
          end: { lat: 40.0799, lng: 116.6031 },
        },
        lanes: 4,
        width: 30,
        speedLimit: 120,
      },
    ],
    landmarks: [
      {
        id: 'tiananmen',
        name: '天安门',
        nameEn: 'Tiananmen',
        type: 'landmark',
        realCoordinates: { lat: 39.9045, lng: 116.3976 },
        width: 100,
        depth: 80,
        height: 35,
        color: '#ef4444',
        description: '中华人民共和国的象征',
      },
      {
        id: 'forbidden_city',
        name: '紫禁城',
        nameEn: 'Forbidden City',
        type: 'landmark',
        realCoordinates: { lat: 39.9163, lng: 116.3971 },
        width: 150,
        depth: 120,
        height: 25,
        color: '#f59e0b',
        description: '明清两代皇宫',
      },
      {
        id: 'great_hall_people',
        name: '人民大会堂',
        nameEn: 'Great Hall of the People',
        type: 'building',
        realCoordinates: { lat: 39.9033, lng: 116.3926 },
        width: 80,
        depth: 60,
        height: 30,
        color: '#dc2626',
        description: '全国人民代表大会召开地',
      },
      {
        id: 'national_museum',
        name: '国家博物馆',
        nameEn: 'National Museum',
        type: 'building',
        realCoordinates: { lat: 39.9052, lng: 116.4017 },
        width: 70,
        depth: 50,
        height: 28,
        color: '#b91c1c',
        description: '中国历史与革命博物馆',
      },
      {
        id: 'beijing_cbd',
        name: '北京CBD',
        nameEn: 'Beijing CBD',
        type: 'building',
        realCoordinates: { lat: 39.9088, lng: 116.4856 },
        width: 200,
        depth: 150,
        height: 80,
        color: '#3b82f6',
        description: '中央商务区',
      },
      {
        id: 'china_zun',
        name: '中国尊',
        nameEn: 'China Zun',
        type: 'building',
        realCoordinates: { lat: 39.9095, lng: 116.4735 },
        width: 40,
        depth: 40,
        height: 120,
        color: '#60a5fa',
        description: '北京最高楼',
      },
      {
        id: 'olympic_stadium',
        name: '鸟巢',
        nameEn: 'Bird\'s Nest',
        type: 'landmark',
        realCoordinates: { lat: 39.9929, lng: 116.3967 },
        width: 80,
        depth: 80,
        height: 25,
        color: '#22c55e',
        description: '国家体育场',
      },
      {
        id: 'water_cube',
        name: '水立方',
        nameEn: 'Water Cube',
        type: 'landmark',
        realCoordinates: { lat: 39.9925, lng: 116.3878 },
        width: 50,
        depth: 50,
        height: 20,
        color: '#06b6d4',
        description: '国家游泳中心',
      },
      {
        id: 'summer_palace',
        name: '颐和园',
        nameEn: 'Summer Palace',
        type: 'park',
        realCoordinates: { lat: 40.0005, lng: 116.2734 },
        width: 200,
        depth: 150,
        height: 15,
        color: '#10b981',
        description: '皇家园林',
      },
      {
        id: 'temple_heaven',
        name: '天坛',
        nameEn: 'Temple of Heaven',
        type: 'landmark',
        realCoordinates: { lat: 39.8822, lng: 116.4066 },
        width: 80,
        depth: 80,
        height: 30,
        color: '#f97316',
        description: '明清皇帝祭天之所',
      },
      {
        id: 'beijing_railway',
        name: '北京站',
        nameEn: 'Beijing Railway Station',
        type: 'transport',
        realCoordinates: { lat: 39.9044, lng: 116.4272 },
        width: 120,
        depth: 60,
        height: 20,
        color: '#8b5cf6',
        description: '主要铁路枢纽',
      },
      {
        id: 'beijing_west',
        name: '北京西站',
        nameEn: 'Beijing West Station',
        type: 'transport',
        realCoordinates: { lat: 39.8936, lng: 116.3225 },
        width: 100,
        depth: 80,
        height: 22,
        color: '#a855f7',
        description: '西部铁路枢纽',
      },
    ],
    rivers: [],
  },

  // 上海
  shanghai: {
    cityId: 'shanghai',
    cityName: '上海市',
    center: { lat: 31.2304, lng: 121.4737 },
    bounds: {
      minLat: 30.7,
      maxLat: 31.9,
      minLng: 120.8,
      maxLng: 122.2,
    },
    roads: [
      {
        id: 'shanghai_nanjing_road',
        name: '南京路',
        nameEn: 'Nanjing Road',
        type: 'main_road',
        realCoordinates: {
          start: { lat: 31.235, lng: 121.45 },
          end: { lat: 31.238, lng: 121.49 },
        },
        lanes: 6,
        width: 35,
        speedLimit: 50,
      },
      {
        id: 'shanghai_the_bund',
        name: '外滩',
        nameEn: 'The Bund',
        type: 'main_road',
        realCoordinates: {
          start: { lat: 31.235, lng: 121.48 },
          end: { lat: 31.245, lng: 121.50 },
        },
        lanes: 4,
        width: 25,
        speedLimit: 40,
      },
      {
        id: 'shanghai_yan_an_road',
        name: '延安路',
        nameEn: 'Yan\'an Road',
        type: 'main_road',
        realCoordinates: {
          start: { lat: 31.22, lng: 121.42 },
          end: { lat: 31.23, lng: 121.52 },
        },
        lanes: 8,
        width: 40,
        speedLimit: 60,
      },
      {
        id: 'shanghai_inner_ring',
        name: '内环线',
        nameEn: 'Inner Ring Road',
        type: 'ring_road',
        realCoordinates: {
          start: { lat: 31.20, lng: 121.42 },
          end: { lat: 31.27, lng: 121.52 },
        },
        lanes: 4,
        width: 25,
        speedLimit: 80,
      },
      {
        id: 'shanghai_middle_ring',
        name: '中环线',
        nameEn: 'Middle Ring Road',
        type: 'ring_road',
        realCoordinates: {
          start: { lat: 31.15, lng: 121.35 },
          end: { lat: 31.30, lng: 121.60 },
        },
        lanes: 6,
        width: 30,
        speedLimit: 100,
      },
      {
        id: 'shanghai_bridge',
        name: '卢浦大桥',
        nameEn: 'Lupu Bridge',
        type: 'main_road',
        realCoordinates: {
          start: { lat: 31.20, lng: 121.47 },
          end: { lat: 31.22, lng: 121.49 },
        },
        lanes: 6,
        width: 35,
        speedLimit: 80,
      },
    ],
    landmarks: [
      {
        id: 'shanghai_orient_pearl',
        name: '东方明珠',
        nameEn: 'Oriental Pearl Tower',
        type: 'landmark',
        realCoordinates: { lat: 31.2397, lng: 121.4998 },
        width: 30,
        depth: 30,
        height: 100,
        color: '#ec4899',
        description: '上海标志性建筑',
      },
      {
        id: 'shanghai_tower',
        name: '上海中心大厦',
        nameEn: 'Shanghai Tower',
        type: 'building',
        realCoordinates: { lat: 31.2336, lng: 121.5057 },
        width: 35,
        depth: 35,
        height: 150,
        color: '#8b5cf6',
        description: '中国第一高楼',
      },
      {
        id: 'shanghai_wfc',
        name: '环球金融中心',
        nameEn: 'Shanghai WFC',
        type: 'building',
        realCoordinates: { lat: 31.2321, lng: 121.5053 },
        width: 30,
        depth: 30,
        height: 130,
        color: '#6366f1',
        description: '开瓶器造型',
      },
      {
        id: 'jin_mao',
        name: '金茂大厦',
        nameEn: 'Jin Mao Tower',
        type: 'building',
        realCoordinates: { lat: 31.2343, lng: 121.5055 },
        width: 28,
        depth: 28,
        height: 110,
        color: '#a78bfa',
        description: '中国传统风格',
      },
      {
        id: 'lujiazui',
        name: '陆家嘴金融区',
        nameEn: 'Lujiazui Financial District',
        type: 'building',
        realCoordinates: { lat: 31.2345, lng: 121.5030 },
        width: 200,
        depth: 150,
        height: 90,
        color: '#3b82f6',
        description: '中国金融中心',
      },
      {
        id: 'the_bund',
        name: '外滩',
        nameEn: 'The Bund',
        type: 'landmark',
        realCoordinates: { lat: 31.2405, lng: 121.4900 },
        width: 180,
        depth: 50,
        height: 20,
        color: '#f59e0b',
        description: '万国建筑博览群',
      },
      {
        id: 'nanjing_road',
        name: '南京路步行街',
        nameEn: 'Nanjing Road Pedestrian Street',
        type: 'landmark',
        realCoordinates: { lat: 31.2360, lng: 121.4730 },
        width: 150,
        depth: 30,
        height: 15,
        color: '#fbbf24',
        description: '中华商业第一街',
      },
      {
        id: 'yu_garden',
        name: '豫园',
        nameEn: 'Yu Garden',
        type: 'park',
        realCoordinates: { lat: 31.2270, lng: 121.4920 },
        width: 80,
        depth: 80,
        height: 12,
        color: '#10b981',
        description: '明代古典园林',
      },
      {
        id: 'shanghai_hongqiao',
        name: '虹桥枢纽',
        nameEn: 'Hongqiao Transport Hub',
        type: 'transport',
        realCoordinates: { lat: 31.1970, lng: 121.3200 },
        width: 150,
        depth: 100,
        height: 25,
        color: '#f472b6',
        description: '综合交通枢纽',
      },
    ],
    rivers: [],
  },

  // 杭州
  hangzhou: {
    cityId: 'hangzhou',
    cityName: '杭州市',
    center: { lat: 30.2741, lng: 120.1551 },
    bounds: {
      minLat: 30.1,
      maxLat: 30.4,
      minLng: 120.0,
      maxLng: 120.4,
    },
    roads: [
      {
        id: 'hangzhou_west_lake_road',
        name: '西湖环线',
        nameEn: 'West Lake Ring Road',
        type: 'ring_road',
        realCoordinates: {
          start: { lat: 30.23, lng: 120.12 },
          end: { lat: 30.27, lng: 120.16 },
        },
        lanes: 4,
        width: 25,
        speedLimit: 50,
      },
      {
        id: 'hangzhou_binjiang',
        name: '滨江大道',
        nameEn: 'Binjiang Avenue',
        type: 'main_road',
        realCoordinates: {
          start: { lat: 30.20, lng: 120.18 },
          end: { lat: 30.25, lng: 120.22 },
        },
        lanes: 6,
        width: 35,
        speedLimit: 60,
      },
    ],
    landmarks: [
      {
        id: 'west_lake',
        name: '西湖',
        nameEn: 'West Lake',
        type: 'park',
        realCoordinates: { lat: 30.25, lng: 120.15 },
        width: 300,
        depth: 250,
        height: 5,
        color: '#06b6d4',
        description: '世界文化遗产',
      },
      {
        id: 'leifeng_pagoda',
        name: '雷峰塔',
        nameEn: 'Leifeng Pagoda',
        type: 'landmark',
        realCoordinates: { lat: 30.231, lng: 120.148 },
        width: 30,
        depth: 30,
        height: 50,
        color: '#f59e0b',
        description: '西湖十景之一',
      },
      {
        id: 'three_pools',
        name: '三潭印月',
        nameEn: 'Three Pools Mirroring the Moon',
        type: 'landmark',
        realCoordinates: { lat: 30.247, lng: 120.149 },
        width: 40,
        depth: 40,
        height: 15,
        color: '#fbbf24',
        description: '西湖标志性景观',
      },
      {
        id: 'broken_bridge',
        name: '断桥残雪',
        nameEn: 'Broken Bridge',
        type: 'landmark',
        realCoordinates: { lat: 30.254, lng: 120.146 },
        width: 25,
        depth: 10,
        height: 8,
        color: '#e5e7eb',
        description: '西湖十景之一',
      },
      {
        id: 'lingyin_temple',
        name: '灵隐寺',
        nameEn: 'Lingyin Temple',
        type: 'landmark',
        realCoordinates: { lat: 30.242, lng: 120.096 },
        width: 60,
        depth: 80,
        height: 35,
        color: '#dc2626',
        description: '江南著名古刹',
      },
      {
        id: 'ali_park',
        name: '阿里巴巴西溪园区',
        nameEn: 'Alibaba Xixi Park',
        type: 'building',
        realCoordinates: { lat: 30.277, lng: 120.028 },
        width: 120,
        depth: 100,
        height: 25,
        color: '#f97316',
        description: '阿里巴巴总部',
      },
    ],
    rivers: [],
  },

  // 广州
  guangzhou: {
    cityId: 'guangzhou',
    cityName: '广州市',
    center: { lat: 23.1291, lng: 113.2644 },
    bounds: {
      minLat: 22.9,
      maxLat: 23.3,
      minLng: 113.1,
      maxLng: 113.5,
    },
    roads: [
      {
        id: 'guangzhou_zhongshan_road',
        name: '中山路',
        nameEn: 'Zhongshan Road',
        type: 'main_road',
        realCoordinates: {
          start: { lat: 23.12, lng: 113.25 },
          end: { lat: 23.14, lng: 113.28 },
        },
        lanes: 6,
        width: 35,
        speedLimit: 60,
      },
    ],
    landmarks: [
      {
        id: 'canton_tower',
        name: '广州塔',
        nameEn: 'Canton Tower',
        type: 'landmark',
        realCoordinates: { lat: 23.1064, lng: 113.3190 },
        width: 25,
        depth: 25,
        height: 120,
        color: '#ef4444',
        description: '广州新地标',
      },
      {
        id: 'pearl_river',
        name: '珠江新城',
        nameEn: 'Pearl River New Town',
        type: 'building',
        realCoordinates: { lat: 23.117, lng: 113.33 },
        width: 180,
        depth: 120,
        height: 70,
        color: '#3b82f6',
        description: 'CBD核心区',
      },
      {
        id: 'citic_plaza',
        name: '中信广场',
        nameEn: 'CITIC Plaza',
        type: 'building',
        realCoordinates: { lat: 23.135, lng: 113.28 },
        width: 30,
        depth: 30,
        height: 90,
        color: '#8b5cf6',
        description: '广州最高楼',
      },
    ],
    rivers: [
      {
        id: 'pearl_river',
        name: '珠江',
        nameEn: 'Pearl River',
        path: [
          { lat: 23.08, lng: 113.25 },
          { lat: 23.10, lng: 113.28 },
          { lat: 23.12, lng: 113.32 },
          { lat: 23.14, lng: 113.35 },
        ],
        width: 200,
      },
    ],
  },

  // 深圳
  shenzhen: {
    cityId: 'shenzhen',
    cityName: '深圳市',
    center: { lat: 22.5431, lng: 114.0579 },
    bounds: {
      minLat: 22.4,
      maxLat: 22.7,
      minLng: 113.9,
      maxLng: 114.3,
    },
    roads: [
      {
        id: 'shenzhen_shennan',
        name: '深南大道',
        nameEn: 'Shennan Avenue',
        type: 'main_road',
        realCoordinates: {
          start: { lat: 22.53, lng: 113.9 },
          end: { lat: 22.55, lng: 114.2 },
        },
        lanes: 8,
        width: 40,
        speedLimit: 60,
      },
    ],
    landmarks: [
      {
        id: 'ping_an_finance',
        name: '平安金融中心',
        nameEn: 'Ping An Finance Center',
        type: 'building',
        realCoordinates: { lat: 22.533, lng: 114.055 },
        width: 35,
        depth: 35,
        height: 140,
        color: '#3b82f6',
        description: '深圳第一高楼',
      },
      {
        id: 'shenzhen_civic_center',
        name: '市民中心',
        nameEn: 'Shenzhen Civic Center',
        type: 'building',
        realCoordinates: { lat: 22.547, lng: 114.057 },
        width: 80,
        depth: 60,
        height: 25,
        color: '#dc2626',
        description: '深圳市政府',
      },
      {
        id: 'window_world',
        name: '世界之窗',
        nameEn: 'Window of the World',
        type: 'park',
        realCoordinates: { lat: 22.539, lng: 113.976 },
        width: 100,
        depth: 80,
        height: 15,
        color: '#10b981',
        description: '主题公园',
      },
    ],
    rivers: [],
  },

  // 成都
  chengdu: {
    cityId: 'chengdu',
    cityName: '成都市',
    center: { lat: 30.5728, lng: 104.0668 },
    bounds: {
      minLat: 30.5,
      maxLat: 30.7,
      minLng: 103.9,
      maxLng: 104.2,
    },
    roads: [
      {
        id: 'chengdu_chunxi',
        name: '春熙路',
        nameEn: 'Chunxi Road',
        type: 'main_road',
        realCoordinates: {
          start: { lat: 30.65, lng: 104.07 },
          end: { lat: 30.66, lng: 104.09 },
        },
        lanes: 6,
        width: 30,
        speedLimit: 40,
      },
    ],
    landmarks: [
      {
        id: 'chengdu_panda_base',
        name: '大熊猫繁育基地',
        nameEn: 'Panda Base',
        type: 'park',
        realCoordinates: { lat: 30.73, lng: 104.15 },
        width: 150,
        depth: 100,
        height: 10,
        color: '#10b981',
        description: '熊猫保护基地',
      },
      {
        id: 'jinli_street',
        name: '锦里',
        nameEn: 'Jinli Ancient Street',
        type: 'landmark',
        realCoordinates: { lat: 30.645, lng: 104.045 },
        width: 80,
        depth: 60,
        height: 12,
        color: '#f59e0b',
        description: '古街文化',
      },
      {
        id: 'dufu_thatched',
        name: '杜甫草堂',
        nameEn: 'Du Fu Thatched Cottage',
        type: 'park',
        realCoordinates: { lat: 30.658, lng: 104.035 },
        width: 60,
        depth: 50,
        height: 10,
        color: '#10b981',
        description: '杜甫故居',
      },
      {
        id: 'tianfu_square',
        name: '天府广场',
        nameEn: 'Tianfu Square',
        type: 'landmark',
        realCoordinates: { lat: 30.657, lng: 104.066 },
        width: 100,
        depth: 80,
        height: 8,
        color: '#dc2626',
        description: '成都市中心',
      },
    ],
    rivers: [],
  },

  // 西安
  xian: {
    cityId: 'xian',
    cityName: '西安市',
    center: { lat: 34.3416, lng: 108.9398 },
    bounds: {
      minLat: 34.1,
      maxLat: 34.4,
      minLng: 108.7,
      maxLng: 109.2,
    },
    roads: [
      {
        id: 'xian_city_wall_road',
        name: '城墙环线',
        nameEn: 'City Wall Ring Road',
        type: 'ring_road',
        realCoordinates: {
          start: { lat: 34.25, lng: 108.92 },
          end: { lat: 34.27, lng: 108.96 },
        },
        lanes: 4,
        width: 20,
        speedLimit: 50,
      },
    ],
    landmarks: [
      {
        id: 'bell_tower',
        name: '钟楼',
        nameEn: 'Bell Tower',
        type: 'landmark',
        realCoordinates: { lat: 34.2595, lng: 108.9404 },
        width: 25,
        depth: 25,
        height: 30,
        color: '#f59e0b',
        description: '西安地标',
      },
      {
        id: 'big_wild_goose',
        name: '大雁塔',
        nameEn: 'Big Wild Goose Pagoda',
        type: 'landmark',
        realCoordinates: { lat: 34.2191, lng: 108.9645 },
        width: 30,
        depth: 30,
        height: 45,
        color: '#ef4444',
        description: '唐代建筑',
      },
      {
        id: 'city_wall',
        name: '明城墙',
        nameEn: 'Ming City Wall',
        type: 'landmark',
        realCoordinates: { lat: 34.26, lng: 108.94 },
        width: 200,
        depth: 200,
        height: 12,
        color: '#9ca3af',
        description: '明代城墙',
      },
      {
        id: 'terracotta',
        name: '兵马俑',
        nameEn: 'Terracotta Warriors',
        type: 'landmark',
        realCoordinates: { lat: 34.3841, lng: 109.2785 },
        width: 100,
        depth: 80,
        height: 10,
        color: '#d97706',
        description: '秦始皇陵',
      },
    ],
    rivers: [],
  },
};

/**
 * 城市地理系统类
 */
export class CityGeographySystem {
  /**
   * 获取城市地理数据
   */
  getCityData(cityId: string): CityGeographyData | null {
    const data = CITIES_GEOGRAPHY[cityId];
    if (!data) {
      logger.warn(`City not found: ${cityId}`);
      return null;
    }
    return data;
  }

  /**
   * 获取城市的地标（转换为3D虚拟坐标）
   */
  getCityLandmarks3D(cityId: string, mapSystem: any): any[] {
    const cityData = this.getCityData(cityId);
    if (!cityData) return [];

    const scale = mapSystem?.getScale?.() || 1;

    return cityData.landmarks.map(lm => {
      const virtual = mapCoordinateSystem.realToVirtual(
        lm.realCoordinates.lat,
        lm.realCoordinates.lng
      );
      return {
        id: lm.id,
        name: lm.name,
        nameEn: lm.nameEn,
        type: lm.type,
        x: virtual.x * scale,
        y: virtual.y,
        z: virtual.z * scale,
        width: lm.width / 10 * scale,  // 转换为虚拟空间单位
        depth: lm.depth / 10 * scale,
        height: lm.height / 10 * scale,
        color: lm.color,
        description: lm.description,
        realCoordinates: lm.realCoordinates,
      };
    });
  }

  /**
   * 获取城市的河流（转换为3D虚拟坐标）
   */
  getCityRivers3D(cityId: string, mapSystem: any): any[] {
    const cityData = this.getCityData(cityId);
    if (!cityData) return [];

    const scale = mapSystem?.getScale?.() || 1;

    return cityData.rivers.map(river => {
      const path3D = river.path.map(coord => {
        const virtual = mapCoordinateSystem.realToVirtual(coord.lat, coord.lng);
        return {
          x: virtual.x * scale,
          y: virtual.y,
          z: virtual.z * scale,
        };
      });

      return {
        id: river.id,
        name: river.name,
        nameEn: river.nameEn,
        path: path3D,
        width: river.width / 10 * scale,
      };
    });
  }

  /**
   * 获取所有支持的城市列表
   */
  getAllCities(): { id: string; name: string }[] {
    return Object.values(CITIES_GEOGRAPHY).map(city => ({
      id: city.cityId,
      name: city.cityName,
    }));
  }
}

// 导出单例
export const cityGeographySystem = new CityGeographySystem();
