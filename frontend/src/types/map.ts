// 地图相关类型定义

export type RegionType = 'country' | 'province' | 'city' | 'district' | 'village';

export interface GeoCoordinates {
  lat: number;
  lng: number;
}

export interface RegionConfig {
  id: string;
  name: string;
  name_en?: string;
  type: RegionType;
  coordinates: GeoCoordinates;
  zoom?: number;
  parent_id?: string;
  has_children: boolean;
  children_count?: number;
  description?: string;
}

export interface RegionDetail extends RegionConfig {
  parent?: {
    id: string;
    name: string;
    type: RegionType;
  };
  children?: RegionConfig[];
  path?: {
    id: string;
    name: string;
    type: RegionType;
  }[];
  stats?: {
    totalChildren: number;
    districtCount: number;
    villageCount: number;
  };
}

export interface MapViewConfig {
  center: GeoCoordinates;
  zoom: number;
}

export interface RegionSearchResult {
  id: string;
  name: string;
  name_en?: string;
  type: RegionType;
  coordinates: GeoCoordinates;
  parent_id?: string;
  description?: string;
}
