// 国家地图系统 - 支持多城市和村庄层级结构

import { GeoCoordinates, Vector3D } from '../types/terrain';

/**
 * 地区类型
 */
export type RegionType = 'country' | 'province' | 'city' | 'district' | 'village';

/**
 * 地区配置
 */
export interface RegionConfig {
  id: string;
  name: string;
  nameEn?: string;
  type: RegionType;
  coordinates: GeoCoordinates;
  zoom?: number;
  parentId?: string;
  children?: string[];
  description?: string;
}

/**
 * 中国省份城市配置数据
 */
export const CHINA_REGIONS: Record<string, RegionConfig> = {
  // 国家
  china: {
    id: 'china',
    name: '中国',
    nameEn: 'China',
    type: 'country',
    coordinates: { lat: 35.8617, lng: 104.1954 },
    zoom: 4,
    children: ['beijing', 'shanghai', 'guangzhou', 'shenzhen', 'hangzhou', 'chengdu', 'xian'],
  },

  // 北京市
  beijing: {
    id: 'beijing',
    name: '北京市',
    nameEn: 'Beijing',
    type: 'city',
    coordinates: { lat: 39.9042, lng: 116.4074 },
    zoom: 10,
    parentId: 'china',
    children: ['dongcheng', 'xicheng', 'chaoyang', 'haidian', 'fengtai'],
    description: '中国首都，政治文化中心',
  },
  dongcheng: {
    id: 'dongcheng',
    name: '东城区',
    type: 'district',
    coordinates: { lat: 39.9289, lng: 116.4169 },
    zoom: 13,
    parentId: 'beijing',
    children: ['tiananmen', 'wangfujing'],
  },
  xicheng: {
    id: 'xicheng',
    name: '西城区',
    type: 'district',
    coordinates: { lat: 39.9139, lng: 116.3661 },
    zoom: 13,
    parentId: 'beijing',
    children: ['xidan', 'financial_street'],
  },
  chaoyang: {
    id: 'chaoyang',
    name: '朝阳区',
    type: 'district',
    coordinates: { lat: 39.9439, lng: 116.4435 },
    zoom: 13,
    parentId: 'beijing',
    children: ['cbd', 'sanlitun', 'olympic_park'],
  },
  haidian: {
    id: 'haidian',
    name: '海淀区',
    type: 'district',
    coordinates: { lat: 39.9593, lng: 116.2985 },
    zoom: 13,
    parentId: 'beijing',
    children: ['zhongguancun', 'summer_palace', 'peking_university'],
  },
  fengtai: {
    id: 'fengtai',
    name: '丰台区',
    type: 'district',
    coordinates: { lat: 39.8583, lng: 116.2873 },
    zoom: 13,
    parentId: 'beijing',
    children: ['beijing_west', 'fengtai_tech'],
  },

  // 村庄/社区级别 (以北京为例)
  tiananmen: {
    id: 'tiananmen',
    name: '天安门广场',
    type: 'village',
    coordinates: { lat: 39.9042, lng: 116.4074 },
    zoom: 16,
    parentId: 'dongcheng',
    description: '北京市中心的广场',
  },
  wangfujing: {
    id: 'wangfujing',
    name: '王府井大街',
    type: 'village',
    coordinates: { lat: 39.9097, lng: 116.4106 },
    zoom: 16,
    parentId: 'dongcheng',
    description: '著名商业街',
  },
  xidan: {
    id: 'xidan',
    name: '西单商业区',
    type: 'village',
    coordinates: { lat: 39.9120, lng: 116.3750 },
    zoom: 16,
    parentId: 'xicheng',
    description: '北京传统商业区',
  },
  financial_street: {
    id: 'financial_street',
    name: '金融街',
    type: 'village',
    coordinates: { lat: 39.9150, lng: 116.3600 },
    zoom: 16,
    parentId: 'xicheng',
    description: '中国金融中心',
  },
  cbd: {
    id: 'cbd',
    name: '北京CBD',
    type: 'village',
    coordinates: { lat: 39.9088, lng: 116.4856 },
    zoom: 16,
    parentId: 'chaoyang',
    description: '中央商务区',
  },
  sanlitun: {
    id: 'sanlitun',
    name: '三里屯',
    type: 'village',
    coordinates: { lat: 39.9368, lng: 116.4555 },
    zoom: 16,
    parentId: 'chaoyang',
    description: '时尚购物娱乐区',
  },
  olympic_park: {
    id: 'olympic_park',
    name: '奥林匹克公园',
    type: 'village',
    coordinates: { lat: 39.9929, lng: 116.3967 },
    zoom: 16,
    parentId: 'chaoyang',
    description: '2008奥运会主场馆',
  },
  zhongguancun: {
    id: 'zhongguancun',
    name: '中关村',
    type: 'village',
    coordinates: { lat: 39.9800, lng: 116.3180 },
    zoom: 16,
    parentId: 'haidian',
    description: '中国硅谷',
  },
  summer_palace: {
    id: 'summer_palace',
    name: '颐和园',
    type: 'village',
    coordinates: { lat: 40.0005, lng: 116.2734 },
    zoom: 16,
    parentId: 'haidian',
    description: '皇家园林',
  },
  peking_university: {
    id: 'peking_university',
    name: '北京大学',
    type: 'village',
    coordinates: { lat: 39.9925, lng: 116.3100 },
    zoom: 16,
    parentId: 'haidian',
    description: '中国顶尖学府',
  },
  beijing_west: {
    id: 'beijing_west',
    name: '北京西站',
    type: 'village',
    coordinates: { lat: 39.8936, lng: 116.3225 },
    zoom: 16,
    parentId: 'fengtai',
    description: '重要铁路枢纽',
  },
  fengtai_tech: {
    id: 'fengtai_tech',
    name: '丰台科技园',
    type: 'village',
    coordinates: { lat: 39.8350, lng: 116.2900 },
    zoom: 16,
    parentId: 'fengtai',
    description: '新兴科技园区',
  },

  // 上海市
  shanghai: {
    id: 'shanghai',
    name: '上海市',
    nameEn: 'Shanghai',
    type: 'city',
    coordinates: { lat: 31.2304, lng: 121.4737 },
    zoom: 10,
    parentId: 'china',
    children: ['pudong', 'huangpu', 'xuhui'],
    description: '中国经济金融中心',
  },
  pudong: {
    id: 'pudong',
    name: '浦东新区',
    type: 'district',
    coordinates: { lat: 31.2304, lng: 121.5447 },
    zoom: 13,
    parentId: 'shanghai',
    children: ['lujiazui', 'shanghai_disney'],
  },
  huangpu: {
    id: 'huangpu',
    name: '黄浦区',
    type: 'district',
    coordinates: { lat: 31.2344, lng: 121.4854 },
    zoom: 13,
    parentId: 'shanghai',
    children: ['the_bund', 'nanjing_road'],
  },
  xuhui: {
    id: 'xuhui',
    name: '徐汇区',
    type: 'district',
    coordinates: { lat: 31.1884, lng: 121.4365 },
    zoom: 13,
    parentId: 'shanghai',
    children: ['xujiahui'],
  },
  lujiazui: {
    id: 'lujiazui',
    name: '陆家嘴',
    type: 'village',
    coordinates: { lat: 31.2444, lng: 121.5058 },
    zoom: 16,
    parentId: 'pudong',
    description: '上海金融中心',
  },
  shanghai_disney: {
    id: 'shanghai_disney',
    name: '上海迪士尼',
    type: 'village',
    coordinates: { lat: 31.1434, lng: 121.6570 },
    zoom: 16,
    parentId: 'pudong',
    description: '迪士尼乐园',
  },
  the_bund: {
    id: 'the_bund',
    name: '外滩',
    type: 'village',
    coordinates: { lat: 31.2444, lng: 121.4916 },
    zoom: 16,
    parentId: 'huangpu',
    description: '上海地标',
  },
  nanjing_road: {
    id: 'nanjing_road',
    name: '南京路',
    type: 'village',
    coordinates: { lat: 31.2384, lng: 121.4756 },
    zoom: 16,
    parentId: 'huangpu',
    description: '著名商业街',
  },
  xujiahui: {
    id: 'xujiahui',
    name: '徐家汇',
    type: 'village',
    coordinates: { lat: 31.1954, lng: 121.4365 },
    zoom: 16,
    parentId: 'xuhui',
    description: '商业中心',
  },

  // 广州市
  guangzhou: {
    id: 'guangzhou',
    name: '广州市',
    nameEn: 'Guangzhou',
    type: 'city',
    coordinates: { lat: 23.1291, lng: 113.2644 },
    zoom: 10,
    parentId: 'china',
    children: ['yuexiu', 'tianhe', 'haizhu'],
    description: '华南中心城市',
  },
  yuexiu: {
    id: 'yuexiu',
    name: '越秀区',
    type: 'district',
    coordinates: { lat: 23.1294, lng: 113.2634 },
    zoom: 13,
    parentId: 'guangzhou',
    children: ['beijing_road', 'sun_yat_sen'],
  },
  tianhe: {
    id: 'tianhe',
    name: '天河区',
    type: 'district',
    coordinates: { lat: 23.1344, lng: 113.3634 },
    zoom: 13,
    parentId: 'guangzhou',
    children: ['gz_cbd', 'cantion_fair'],
  },
  haizhu: {
    id: 'haizhu',
    name: '海珠区',
    type: 'district',
    coordinates: { lat: 23.0844, lng: 113.3634 },
    zoom: 13,
    parentId: 'guangzhou',
    children: ['canton_tower'],
  },
  beijing_road: {
    id: 'beijing_road',
    name: '北京路',
    type: 'village',
    coordinates: { lat: 23.1244, lng: 113.2634 },
    zoom: 16,
    parentId: 'yuexiu',
    description: '著名步行街',
  },
  sun_yat_sen: {
    id: 'sun_yat_sen',
    name: '中山纪念堂',
    type: 'village',
    coordinates: { lat: 23.1344, lng: 113.2834 },
    zoom: 16,
    parentId: 'yuexiu',
    description: '历史建筑',
  },
  gz_cbd: {
    id: 'gz_cbd',
    name: '珠江新城',
    type: 'village',
    coordinates: { lat: 23.1244, lng: 113.3234 },
    zoom: 16,
    parentId: 'tianhe',
    description: '广州CBD',
  },
  cantion_fair: {
    id: 'cantion_fair',
    name: '广交会展馆',
    type: 'village',
    coordinates: { lat: 23.1044, lng: 113.3634 },
    zoom: 16,
    parentId: 'tianhe',
    description: '展会中心',
  },
  canton_tower: {
    id: 'canton_tower',
    name: '广州塔',
    type: 'village',
    coordinates: { lat: 23.1094, lng: 113.3244 },
    zoom: 16,
    parentId: 'haizhu',
    description: '广州地标',
  },

  // 深圳市
  shenzhen: {
    id: 'shenzhen',
    name: '深圳市',
    nameEn: 'Shenzhen',
    type: 'city',
    coordinates: { lat: 22.5431, lng: 114.0579 },
    zoom: 10,
    parentId: 'china',
    children: ['futian', 'nanshan', 'qianhai'],
    description: '科技创新中心',
  },
  futian: {
    id: 'futian',
    name: '福田区',
    type: 'district',
    coordinates: { lat: 22.5331, lng: 114.0579 },
    zoom: 13,
    parentId: 'shenzhen',
    children: ['sz_cbd', 'citic_plaza'],
  },
  nanshan: {
    id: 'nanshan',
    name: '南山区',
    type: 'district',
    coordinates: { lat: 22.5331, lng: 113.9579 },
    zoom: 13,
    parentId: 'shenzhen',
    children: ['shenzhen_high_tech', 'shekou'],
  },
  qianhai: {
    id: 'qianhai',
    name: '前海合作区',
    type: 'district',
    coordinates: { lat: 22.5331, lng: 113.9079 },
    zoom: 13,
    parentId: 'shenzhen',
    children: ['qianhai_center'],
  },
  sz_cbd: {
    id: 'sz_cbd',
    name: '福田CBD',
    type: 'village',
    coordinates: { lat: 22.5331, lng: 114.0579 },
    zoom: 16,
    parentId: 'futian',
    description: '深圳中心商务区',
  },
  citic_plaza: {
    id: 'citic_plaza',
    name: '中信广场',
    type: 'village',
    coordinates: { lat: 22.5431, lng: 114.0679 },
    zoom: 16,
    parentId: 'futian',
    description: '商业中心',
  },
  shenzhen_high_tech: {
    id: 'shenzhen_high_tech',
    name: '高新科技园',
    type: 'village',
    coordinates: { lat: 22.5331, lng: 113.9579 },
    zoom: 16,
    parentId: 'nanshan',
    description: '科技企业聚集地',
  },
  shekou: {
    id: 'shekou',
    name: '蛇口',
    type: 'village',
    coordinates: { lat: 22.4831, lng: 113.9279 },
    zoom: 16,
    parentId: 'nanshan',
    description: '海滨工业区',
  },
  qianhai_center: {
    id: 'qianhai_center',
    name: '前海中心',
    type: 'village',
    coordinates: { lat: 22.5331, lng: 113.9079 },
    zoom: 16,
    parentId: 'qianhai',
    description: '前海核心区',
  },

  // 杭州市
  hangzhou: {
    id: 'hangzhou',
    name: '杭州市',
    nameEn: 'Hangzhou',
    type: 'city',
    coordinates: { lat: 30.2741, lng: 120.1551 },
    zoom: 10,
    parentId: 'china',
    children: ['shangcheng', 'xiacheng', 'binjiang'],
    description: '互联网之都',
  },
  shangcheng: {
    id: 'shangcheng',
    name: '上城区',
    type: 'district',
    coordinates: { lat: 30.2641, lng: 120.1651 },
    zoom: 13,
    parentId: 'hangzhou',
    children: ['west_lake'],
  },
  xiacheng: {
    id: 'xiacheng',
    name: '下城区',
    type: 'district',
    coordinates: { lat: 30.2741, lng: 120.1751 },
    zoom: 13,
    parentId: 'hangzhou',
    children: ['wulin_square'],
  },
  binjiang: {
    id: 'binjiang',
    name: '滨江区',
    type: 'district',
    coordinates: { lat: 30.2041, lng: 120.2151 },
    zoom: 13,
    parentId: 'hangzhou',
    children: ['ali_park', 'netease'],
  },
  west_lake: {
    id: 'west_lake',
    name: '西湖',
    type: 'village',
    coordinates: { lat: 30.2541, lng: 120.1451 },
    zoom: 16,
    parentId: 'shangcheng',
    description: '世界文化遗产',
  },
  wulin_square: {
    id: 'wulin_square',
    name: '武林广场',
    type: 'village',
    coordinates: { lat: 30.2741, lng: 120.1651 },
    zoom: 16,
    parentId: 'xiacheng',
    description: '市中心广场',
  },
  ali_park: {
    id: 'ali_park',
    name: '阿里巴巴西溪园区',
    type: 'village',
    coordinates: { lat: 30.2841, lng: 120.0551 },
    zoom: 16,
    parentId: 'binjiang',
    description: '阿里巴巴总部',
  },
  netease: {
    id: 'netease',
    name: '网易大厦',
    type: 'village',
    coordinates: { lat: 30.1941, lng: 120.1951 },
    zoom: 16,
    parentId: 'binjiang',
    description: '网易总部',
  },

  // 成都市
  chengdu: {
    id: 'chengdu',
    name: '成都市',
    nameEn: 'Chengdu',
    type: 'city',
    coordinates: { lat: 30.5728, lng: 104.0668 },
    zoom: 10,
    parentId: 'china',
    children: ['jinjiang', 'qingyang', 'gaoxin'],
    description: '天府之国',
  },
  jinjiang: {
    id: 'jinjiang',
    name: '锦江区',
    type: 'district',
    coordinates: { lat: 30.6628, lng: 104.0868 },
    zoom: 13,
    parentId: 'chengdu',
    children: ['chunxi_road', 'tianfu_square'],
  },
  qingyang: {
    id: 'qingyang',
    name: '青羊区',
    type: 'district',
    coordinates: { lat: 30.6728, lng: 104.0468 },
    zoom: 13,
    parentId: 'chengdu',
    children: ['dufu_thatched', 'qingyang_temple'],
  },
  gaoxin: {
    id: 'gaoxin',
    name: '高新区',
    type: 'district',
    coordinates: { lat: 30.5428, lng: 104.0668 },
    zoom: 13,
    parentId: 'chengdu',
    children: ['tencent_chengdu'],
  },
  chunxi_road: {
    id: 'chunxi_road',
    name: '春熙路',
    type: 'village',
    coordinates: { lat: 30.6528, lng: 104.0868 },
    zoom: 16,
    parentId: 'jinjiang',
    description: '著名步行街',
  },
  tianfu_square: {
    id: 'tianfu_square',
    name: '天府广场',
    type: 'village',
    coordinates: { lat: 30.6628, lng: 104.0768 },
    zoom: 16,
    parentId: 'jinjiang',
    description: '市中心广场',
  },
  dufu_thatched: {
    id: 'dufu_thatched',
    name: '杜甫草堂',
    type: 'village',
    coordinates: { lat: 30.6828, lng: 104.0368 },
    zoom: 16,
    parentId: 'qingyang',
    description: '杜甫故居',
  },
  qingyang_temple: {
    id: 'qingyang_temple',
    name: '青羊宫',
    type: 'village',
    coordinates: { lat: 30.6628, lng: 104.0368 },
    zoom: 16,
    parentId: 'qingyang',
    description: '道教宫观',
  },
  tencent_chengdu: {
    id: 'tencent_chengdu',
    name: '腾讯成都大厦',
    type: 'village',
    coordinates: { lat: 30.5428, lng: 104.0668 },
    zoom: 16,
    parentId: 'gaoxin',
    description: '腾讯成都分公司',
  },

  // 西安市
  xian: {
    id: 'xian',
    name: '西安市',
    nameEn: "Xi'an",
    type: 'city',
    coordinates: { lat: 34.3416, lng: 108.9398 },
    zoom: 10,
    parentId: 'china',
    children: ['beilin', 'yanta', 'weiyang'],
    description: '十三朝古都',
  },
  beilin: {
    id: 'beilin',
    name: '碑林区',
    type: 'district',
    coordinates: { lat: 34.2516, lng: 108.9498 },
    zoom: 13,
    parentId: 'xian',
    children: ['bell_tower', 'big_wild_goose'],
  },
  yanta: {
    id: 'yanta',
    name: '雁塔区',
    type: 'district',
    coordinates: { lat: 34.2116, lng: 108.9298 },
    zoom: 13,
    parentId: 'xian',
    children: ['qujiang', 'datang_everbright'],
  },
  weiyang: {
    id: 'weiyang',
    name: '未央区',
    type: 'district',
    coordinates: { lat: 34.3116, lng: 108.9198 },
    zoom: 13,
    parentId: 'xian',
    children: ['city_wall', 'weiyang_palace'],
  },
  bell_tower: {
    id: 'bell_tower',
    name: '钟楼',
    type: 'village',
    coordinates: { lat: 34.2616, lng: 108.9398 },
    zoom: 16,
    parentId: 'beilin',
    description: '西安地标',
  },
  big_wild_goose: {
    id: 'big_wild_goose',
    name: '大雁塔',
    type: 'village',
    coordinates: { lat: 34.2216, lng: 108.9698 },
    zoom: 16,
    parentId: 'beilin',
    description: '唐代建筑',
  },
  qujiang: {
    id: 'qujiang',
    name: '曲江新区',
    type: 'village',
    coordinates: { lat: 34.1916, lng: 108.9698 },
    zoom: 16,
    parentId: 'yanta',
    description: '文化旅游区',
  },
  datang_everbright: {
    id: 'datang_everbright',
    name: '大唐不夜城',
    type: 'village',
    coordinates: { lat: 34.2116, lng: 108.9698 },
    zoom: 16,
    parentId: 'yanta',
    description: '文化商业街',
  },
  city_wall: {
    id: 'city_wall',
    name: '明城墙',
    type: 'village',
    coordinates: { lat: 34.2716, lng: 108.9398 },
    zoom: 16,
    parentId: 'weiyang',
    description: '明代城墙',
  },
  weiyang_palace: {
    id: 'weiyang_palace',
    name: '未央宫',
    type: 'village',
    coordinates: { lat: 34.2916, lng: 108.9198 },
    zoom: 16,
    parentId: 'weiyang',
    description: '汉未央宫遗址',
  },
};

/**
 * 国家地图系统类
 */
export class CountryMapSystem {
  private regions: Map<string, RegionConfig> = new Map();
  private currentRegion: RegionConfig | null = null;

  constructor() {
    // 初始化所有地区
    Object.values(CHINA_REGIONS).forEach(region => {
      this.regions.set(region.id, region);
    });

    // 默认选择中国
    this.currentRegion = CHINA_REGIONS.china;
  }

  /**
   * 获取地区配置
   */
  getRegion(id: string): RegionConfig | undefined {
    return this.regions.get(id);
  }

  /**
   * 获取当前选择的地区
   */
  getCurrentRegion(): RegionConfig | null {
    return this.currentRegion;
  }

  /**
   * 设置当前地区
   */
  setRegion(id: string): boolean {
    const region = this.regions.get(id);
    if (region) {
      this.currentRegion = region;
      return true;
    }
    return false;
  }

  /**
   * 获取地区的直接子地区
   */
  getChildren(parentId: string): RegionConfig[] {
    const parent = this.regions.get(parentId);
    if (!parent || !parent.children) {
      return [];
    }

    return parent.children
      .map(childId => this.regions.get(childId))
      .filter((r): r is RegionConfig => r !== undefined);
  }

  /**
   * 获取地区的父地区
   */
  getParent(regionId: string): RegionConfig | undefined {
    const region = this.regions.get(regionId);
    if (!region || !region.parentId) {
      return undefined;
    }
    return this.regions.get(region.parentId);
  }

  /**
   * 获取从根到当前地区的路径
   */
  getPath(regionId: string): RegionConfig[] {
    const path: RegionConfig[] = [];
    let current = this.regions.get(regionId);

    while (current) {
      path.unshift(current);
      current = current.parentId ? this.regions.get(current.parentId) : undefined;
    }

    return path;
  }

  /**
   * 获取所有顶层地区（国家）
   */
  getTopLevelRegions(): RegionConfig[] {
    return Array.from(this.regions.values()).filter(r => r.type === 'country');
  }

  /**
   * 根据类型获取地区
   */
  getRegionsByType(type: RegionType): RegionConfig[] {
    return Array.from(this.regions.values()).filter(r => r.type === type);
  }

  /**
   * 搜索地区
   */
  searchRegions(keyword: string): RegionConfig[] {
    const lowerKeyword = keyword.toLowerCase();
    return Array.from(this.regions.values()).filter(
      r => r.name.toLowerCase().includes(lowerKeyword) ||
           (r.nameEn && r.nameEn.toLowerCase().includes(lowerKeyword))
    );
  }

  /**
   * 获取地区地图视图配置
   */
  getMapView(regionId: string): { center: GeoCoordinates; zoom: number } | null {
    const region = this.regions.get(regionId);
    if (!region) {
      return null;
    }

    return {
      center: region.coordinates,
      zoom: region.zoom || 10,
    };
  }

  /**
   * 获取所有可用的城市
   */
  getCities(): RegionConfig[] {
    return this.getRegionsByType('city');
  }

  /**
   * 获取所有可用的村庄/社区
   */
  getVillages(): RegionConfig[] {
    return this.getRegionsByType('village');
  }

  /**
   * 获取地区的统计信息
   */
  getRegionStats(regionId: string): {
    totalChildren: number;
    districtCount: number;
    villageCount: number;
  } | null {
    const region = this.regions.get(regionId);
    if (!region) {
      return null;
    }

    const children = region.children || [];
    let districtCount = 0;
    let villageCount = 0;

    for (const childId of children) {
      const child = this.regions.get(childId);
      if (child) {
        if (child.type === 'district') {
          districtCount++;
          // 统计区下面的村庄
          const grandChildren = child.children || [];
          villageCount += grandChildren.filter(gcId => {
            const gc = this.regions.get(gcId);
            return gc && gc.type === 'village';
          }).length;
        } else if (child.type === 'village') {
          villageCount++;
        }
      }
    }

    return {
      totalChildren: children.length,
      districtCount,
      villageCount,
    };
  }
}

// 导出单例实例
export const countryMapSystem = new CountryMapSystem();
