// 道路网络相关类型定义

/**
 * 道路类型
 */
export type RoadType = 'highway' | 'main_road' | 'secondary_road' | 'alley' | 'ring_road';

/**
 * 道路配置
 */
export interface RoadConfig {
  road_id: string;
  name: string;
  type: RoadType;
  width: number;
  lanes: number;
  speedLimit: number;
  path: Vector3D[];
  isOneWay?: boolean;
  hasLaneMarkings?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * 道路路段
 */
export interface RoadSegment {
  id: string;
  roadId: string;
  startPoint: Vector3D;
  endPoint: Vector3D;
  length: number;
  width: number;
  lanes: number;
  direction: number; // radians
  connectedSegments: string[]; // segment IDs
  speedLimit: number;
}

/**
 * 路径节点（用于A*寻路）
 */
export interface PathNode {
  id: string;
  position: Vector3D;
  connections: string[]; // neighboring node IDs
  weights: Record<string, number>; // connection weights
  roadId?: string;
  isIntersection?: boolean;
  trafficLight?: TrafficLightState;
}

/**
 * 交通灯状态
 */
export interface TrafficLightState {
  id: string;
  currentState: 'red' | 'yellow' | 'green';
  direction?: 'north-south' | 'east-west';
  nextChangeTime?: Date;
  cycleDuration?: number;
}

/**
 * 路口
 */
export interface Intersection {
  id: string;
  position: Vector3D;
  roads: string[]; // road IDs
  trafficLight?: TrafficLightState;
  isTrafficControlled: boolean;
}

/**
 * 导航路线
 */
export interface Route {
  nodes: PathNode[];
  segments: RoadSegment[];
  totalDistance: number;
  estimatedTime: number;
  waypoints: Vector3D[];
}

/**
 * A*寻路请求
 */
export interface PathfindingRequest {
  start: Vector3D;
  end: Vector3D;
  vehicleType?: string;
  avoidHighways?: boolean;
  avoidTolls?: boolean;
}

/**
 * 道路网络配置
 */
export interface RoadNetworkConfig {
  mapSize: number;
  roads: RoadConfig[];
  intersections: Intersection[];
  pathNodes: PathNode[];
}

/**
 * 向量3D
 */
export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

/**
 * 北京特定道路定义
 */
export interface BeijingRoadDefinition {
  id: string;
  name: string;
  nameEn?: string;
  type: RoadType;
  realCoordinates: {
    start: { lat: number; lng: number };
    end: { lat: number; lng: number };
    waypoints?: { lat: number; lng: number }[];
  };
  virtualPath?: Vector3D[];
  lanes: number;
  width: number;
  speedLimit: number;
}
