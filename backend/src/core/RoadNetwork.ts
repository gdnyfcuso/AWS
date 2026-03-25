// 道路网络系统 - 北京道路网络与A*寻路

import { createLogger } from '../utils/logger';
import { mapCoordinateSystem } from './MapCoordinateSystem';
import {
  RoadConfig,
  RoadSegment,
  PathNode,
  Intersection,
  Route,
  PathfindingRequest,
  BeijingRoadDefinition,
  Vector3D,
  RoadType,
} from '../types/road';
import { getDatabase } from '../services/database';

const logger = createLogger('RoadNetwork');

/**
 * 北京主要道路定义
 */
const BEIJING_ROADS: BeijingRoadDefinition[] = [
  // 环路 - 使用包围盒坐标定义 (minLat,minLng 到 maxLat,maxLng)
  {
    id: 'ring_road_2',
    name: '二环路',
    nameEn: '2nd Ring Road',
    type: 'ring_road',
    realCoordinates: {
      start: { lat: 39.85, lng: 116.35 }, // 西南角
      end: { lat: 39.96, lng: 116.47 },   // 东北角
    },
    lanes: 6,
    width: 30,
    speedLimit: 80,
  },
  {
    id: 'ring_road_3',
    name: '三环路',
    nameEn: '3rd Ring Road',
    type: 'ring_road',
    realCoordinates: {
      start: { lat: 39.82, lng: 116.30 }, // 西南角
      end: { lat: 39.98, lng: 116.52 },   // 东北角
    },
    lanes: 6,
    width: 32,
    speedLimit: 100,
  },
  {
    id: 'ring_road_4',
    name: '四环路',
    nameEn: '4th Ring Road',
    type: 'ring_road',
    realCoordinates: {
      start: { lat: 39.78, lng: 116.25 }, // 西南角
      end: { lat: 40.02, lng: 116.57 },   // 东北角
    },
    lanes: 8,
    width: 35,
    speedLimit: 100,
  },
  {
    id: 'ring_road_5',
    name: '五环路',
    nameEn: '5th Ring Road',
    type: 'highway',
    realCoordinates: {
      start: { lat: 39.75, lng: 116.18 }, // 西南角
      end: { lat: 40.08, lng: 116.64 },   // 东北角
    },
    lanes: 6,
    width: 40,
    speedLimit: 100,
  },
  // 主干道
  {
    id: 'changan_ave',
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
    id: 'central_axis',
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
    id: 'jinrong_street',
    name: '金融街',
    nameEn: 'Financial Street',
    type: 'main_road',
    realCoordinates: {
      start: { lat: 39.9142, lng: 116.3474 },
      end: { lat: 39.9142, lng: 116.3874 },
    },
    lanes: 4,
    width: 25,
    speedLimit: 50,
  },
  {
    id: 'wangfujing_street',
    name: '王府井大街',
    nameEn: 'Wangfujing Street',
    type: 'secondary_road',
    realCoordinates: {
      start: { lat: 39.9092, lng: 116.4074 },
      end: { lat: 39.9192, lng: 116.4174 },
    },
    lanes: 4,
    width: 20,
    speedLimit: 40,
  },
  // 高速公路
  {
    id: 'airport_expressway',
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
  {
    id: 'jingjin_expressway',
    name: '京津高速',
    nameEn: 'Jingjin Expressway',
    type: 'highway',
    realCoordinates: {
      start: { lat: 39.8242, lng: 116.5174 },
      end: { lat: 39.1042, lng: 117.2074 },
    },
    lanes: 4,
    width: 30,
    speedLimit: 120,
  },
  {
    id: 'jingkai_expressway',
    name: '京开高速',
    nameEn: 'Jingkai Expressway',
    type: 'highway',
    realCoordinates: {
      start: { lat: 39.8642, lng: 116.3574 },
      end: { lat: 39.4042, lng: 116.0074 },
    },
    lanes: 4,
    width: 30,
    speedLimit: 120,
  },
  {
    id: 'jinggang_expressway',
    name: '京港高速',
    nameEn: 'Jinggang Expressway',
    type: 'highway',
    realCoordinates: {
      start: { lat: 39.9042, lng: 116.4474 },
      end: { lat: 38.9042, lng: 114.5074 },
    },
    lanes: 4,
    width: 30,
    speedLimit: 120,
  },
];

/**
 * 道路网络系统类
 */
export class RoadNetwork {
  private roads: Map<string, RoadConfig> = new Map();
  private segments: Map<string, RoadSegment> = new Map();
  private nodes: Map<string, PathNode> = new Map();
  private intersections: Map<string, Intersection> = new Map();

  /**
   * 初始化道路网络
   */
  async initialize(): Promise<void> {
    await this.loadRoads();
    await this.generateDefaultRoads();
    await this.buildNetworkGraph();
    logger.info(`RoadNetwork initialized with ${this.roads.size} roads, ${this.segments.size} segments, ${this.nodes.size} nodes`);
  }

  /**
   * 从数据库加载道路
   */
  private async loadRoads(): Promise<void> {
    try {
      const db = getDatabase();
      const roads = await db.road.findMany();

      for (const road of roads) {
        const roadConfig: RoadConfig = {
          road_id: road.road_id,
          name: road.name,
          nameEn: road.name_en || undefined,
          type: road.type as RoadType,
          width: road.width,
          lanes: road.lanes,
          speedLimit: road.speed_limit,
          path: road.path as Vector3D[],
          isOneWay: false,
          hasLaneMarkings: road.has_lane_markings,
          metadata: road.metadata as Record<string, unknown> | undefined,
        };
        this.roads.set(road.road_id, roadConfig);
      }
    } catch (error) {
      logger.warn('Failed to load roads from database:', error);
    }
  }

  /**
   * 生成默认北京道路网络
   */
  private async generateDefaultRoads(): Promise<void> {
    if (this.roads.size > 0) {
      logger.info('Roads already loaded, skipping generation');
      return;
    }

    // 生成环路
    await this.generateRingRoads();

    // 生成主干道
    await this.generateMainRoads();

    // 生成连接道路
    await this.generateConnectorRoads();

    // 创建路口
    await this.createIntersections();

    // 保存到数据库
    await this.saveRoadsToDatabase();
  }

  /**
   * 生成环路 - 使用真实地理坐标
   */
  private async generateRingRoads(): Promise<void> {
    const ringRoads = ['ring_road_2', 'ring_road_3', 'ring_road_4', 'ring_road_5'];

    for (const roadId of ringRoads) {
      const roadDef = BEIJING_ROADS.find(r => r.id === roadId);
      if (!roadDef) continue;

      // 使用真实坐标生成路径
      const path = this.generateRingRoadPathFromRealCoords(roadDef);
      await this.createRoad({
        road_id: roadDef.id,
        name: roadDef.name,
        nameEn: roadDef.nameEn,
        type: roadDef.type,
        width: roadDef.width,
        lanes: roadDef.lanes,
        speedLimit: roadDef.speedLimit,
        path,
        isOneWay: false,
        hasLaneMarkings: true,
      });
    }
  }

  /**
   * 生成环形道路路径 - 基于真实地理坐标
   * start/end 定义为环路包围盒的对角线坐标
   */
  private generateRingRoadPathFromRealCoords(roadDef: BeijingRoadDefinition): Vector3D[] {
    const path: Vector3D[] = [];
    const segments = 64; // 圆的分段数

    // 从真实坐标获取环路的边界包围盒
    const { start, end } = roadDef.realCoordinates;

    // 计算环路的中心点（start 和 end 的平均值）
    const centerLat = (start.lat + end.lat) / 2;
    const centerLng = (start.lng + end.lng) / 2;

    // 转换为虚拟空间坐标
    const centerVirtual = mapCoordinateSystem.realToVirtual(centerLat, centerLng);

    // 计算半轴长度 - 使用 start 和 end 作为包围盒的对角线
    // 需要找到环路在各个方向的边界
    const minLat = Math.min(start.lat, end.lat);
    const maxLat = Math.max(start.lat, end.lat);
    const minLng = Math.min(start.lng, end.lng);
    const maxLng = Math.max(start.lng, end.lng);

    // 计算四个角点的虚拟坐标来确定椭圆的边界
    const topLeft = mapCoordinateSystem.realToVirtual(maxLat, minLng);
    const topRight = mapCoordinateSystem.realToVirtual(maxLat, maxLng);
    const bottomLeft = mapCoordinateSystem.realToVirtual(minLat, minLng);
    const bottomRight = mapCoordinateSystem.realToVirtual(minLat, maxLng);

    // 计算椭圆的半轴长度
    const radiusX = Math.max(
      Math.abs(topRight.x - topLeft.x) / 2,
      Math.abs(bottomRight.x - bottomLeft.x) / 2
    );
    const radiusZ = Math.max(
      Math.abs(topLeft.z - bottomLeft.z) / 2,
      Math.abs(topRight.z - bottomRight.z) / 2
    );

    // 生成椭圆路径
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      path.push({
        x: centerVirtual.x + Math.cos(angle) * radiusX,
        y: 0,
        z: centerVirtual.z + Math.sin(angle) * radiusZ,
      });
    }

    logger.info(`Generated ring road ${roadDef.id} with ${path.length} points from real coords (radiusX: ${radiusX.toFixed(1)}, radiusZ: ${radiusZ.toFixed(1)})`);
    return path;
  }

  /**
   * 生成线性道路路径 - 基于真实地理坐标
   */
  private generateLinearPathFromRealCoords(roadDef: BeijingRoadDefinition): Vector3D[] {
    const path: Vector3D[] = [];
    const steps = 30; // 路径点数

    const { start, end } = roadDef.realCoordinates;

    // 如果有中间路径点，使用它们生成更精确的路径
    const waypoints = roadDef.realCoordinates.waypoints || [start, end];
    const allPoints = [start, ...waypoints, end];

    // 生成路径
    for (let i = 0; i < allPoints.length - 1; i++) {
      const segmentStart = allPoints[i];
      const segmentEnd = allPoints[i + 1];

      for (let j = 0; j < steps; j++) {
        const t = j / steps;
        const lat = segmentStart.lat + (segmentEnd.lat - segmentStart.lat) * t;
        const lng = segmentStart.lng + (segmentEnd.lng - segmentStart.lng) * t;
        const virtual = mapCoordinateSystem.realToVirtual(lat, lng);
        path.push(virtual);
      }
    }

    // 添加最后一个点
    const lastVirtual = mapCoordinateSystem.realToVirtual(end.lat, end.lng);
    path.push(lastVirtual);

    logger.info(`Generated linear road ${roadDef.id} with ${path.length} points from real coords`);
    return path;
  }

  /**
   * 生成主干道 - 使用真实地理坐标
   */
  private async generateMainRoads(): Promise<void> {
    const mainRoads = ['changan_ave', 'central_axis', 'jinrong_street', 'wangfujing_street'];

    for (const roadId of mainRoads) {
      const roadDef = BEIJING_ROADS.find(r => r.id === roadId);
      if (!roadDef) continue;

      // 使用真实坐标生成路径
      const path = this.generateLinearPathFromRealCoords(roadDef);
      await this.createRoad({
        road_id: roadDef.id,
        name: roadDef.name,
        nameEn: roadDef.nameEn,
        type: roadDef.type,
        width: roadDef.width,
        lanes: roadDef.lanes,
        speedLimit: roadDef.speedLimit,
        path,
        isOneWay: false,
        hasLaneMarkings: true,
      });
    }
  }

  /**
   * 生成连接道路
   */
  private async generateConnectorRoads(): Promise<void> {
    // 生成放射状道路连接环路
    const connectors = [
      { start: { x: 0, z: 0 }, end: { x: 200, z: 0 }, name: '东直门外大街' },
      { start: { x: 0, z: 0 }, end: { x: -200, z: 0 }, name: '西直门外大街' },
      { start: { x: 0, z: 0 }, end: { x: 0, z: 150 }, name: '安定门内大街' },
      { start: { x: 0, z: 0 }, end: { x: 0, z: -150 }, name: '前门大街' },
      { start: { x: 0, z: 0 }, end: { x: 150, z: 150 }, name: '东北方向连接路' },
      { start: { x: 0, z: 0 }, end: { x: -150, z: 150 }, name: '西北方向连接路' },
      { start: { x: 0, z: 0 }, end: { x: 150, z: -150 }, name: '东南方向连接路' },
      { start: { x: 0, z: 0 }, end: { x: -150, z: -150 }, name: '西南方向连接路' },
    ];

    for (let i = 0; i < connectors.length; i++) {
      const conn = connectors[i];
      const path: Vector3D[] = [];
      const steps = 10;
      for (let j = 0; j <= steps; j++) {
        const t = j / steps;
        path.push({
          x: conn.start.x + (conn.end.x - conn.start.x) * t,
          y: 0,
          z: conn.start.z + (conn.end.z - conn.start.z) * t,
        });
      }

      await this.createRoad({
        road_id: `connector_${i}`,
        name: conn.name,
        type: 'secondary_road',
        width: 20,
        lanes: 4,
        speedLimit: 50,
        path,
        isOneWay: false,
        hasLaneMarkings: true,
      });
    }
  }

  /**
   * 创建路口
   */
  private async createIntersections(): Promise<void> {
    // 天安门路口
    await this.createIntersection({
      id: 'intersection_tiananmen',
      position: { x: 0, y: 0, z: 0 },
      roads: ['changan_ave', 'central_axis'],
      isTrafficControlled: true,
    });

    // 二环路路口
    const ring2Intersections = [
      { x: 80, z: 0 },
      { x: -80, z: 0 },
      { x: 0, z: 80 },
      { x: 0, z: -80 },
      { x: 57, z: 57 },
      { x: -57, z: 57 },
      { x: 57, z: -57 },
      { x: -57, z: -57 },
    ];

    for (let i = 0; i < ring2Intersections.length; i++) {
      await this.createIntersection({
        id: `intersection_ring2_${i}`,
        position: ring2Intersections[i],
        roads: ['ring_road_2'],
        isTrafficControlled: true,
      });
    }

    // 三环路路口
    const ring3Intersections = [
      { x: 120, z: 0 },
      { x: -120, z: 0 },
      { x: 0, z: 120 },
      { x: 0, z: -120 },
    ];

    for (let i = 0; i < ring3Intersections.length; i++) {
      await this.createIntersection({
        id: `intersection_ring3_${i}`,
        position: ring3Intersections[i],
        roads: ['ring_road_3'],
        isTrafficControlled: true,
      });
    }
  }

  /**
   * 创建道路
   */
  async createRoad(config: RoadConfig): Promise<void> {
    this.roads.set(config.road_id, config);

    // 创建道路路段
    for (let i = 0; i < config.path.length - 1; i++) {
      const start = config.path[i];
      const end = config.path[i + 1];
      const segmentId = `${config.road_id}_seg_${i}`;

      const length = Math.sqrt(
        Math.pow(end.x - start.x, 2) +
        Math.pow(end.z - start.z, 2)
      );

      const direction = Math.atan2(end.z - start.z, end.x - start.x);

      const segment: RoadSegment = {
        id: segmentId,
        roadId: config.road_id,
        startPoint: start,
        endPoint: end,
        length,
        width: config.width,
        lanes: config.lanes,
        direction,
        connectedSegments: [],
        speedLimit: config.speedLimit,
      };

      this.segments.set(segmentId, segment);
    }
  }

  /**
   * 创建路口
   */
  async createIntersection(intersection: Intersection): Promise<void> {
    this.intersections.set(intersection.id, intersection);
  }

  /**
   * 构建网络图（用于A*寻路）
   */
  private async buildNetworkGraph(): Promise<void> {
    // 为每个道路端点创建节点
    for (const [roadId, road] of this.roads) {
      const path = road.path;

      // 起点节点
      const startNodeId = `${roadId}_start`;
      if (!this.nodes.has(startNodeId)) {
        this.nodes.set(startNodeId, {
          id: startNodeId,
          position: path[0],
          connections: [],
          weights: {},
          roadId,
          isIntersection: this.isIntersectionAt(path[0]),
        });
      }

      // 终点节点
      const endNodeId = `${roadId}_end`;
      if (!this.nodes.has(endNodeId)) {
        this.nodes.set(endNodeId, {
          id: endNodeId,
          position: path[path.length - 1],
          connections: [],
          weights: {},
          roadId,
          isIntersection: this.isIntersectionAt(path[path.length - 1]),
        });
      }
    }

    // 连接节点
    this.connectNodes();
  }

  /**
   * 判断位置是否是路口
   */
  private isIntersectionAt(position: Vector3D): boolean {
    for (const intersection of this.intersections.values()) {
      const dist = Math.sqrt(
        Math.pow(position.x - intersection.position.x, 2) +
        Math.pow(position.z - intersection.position.z, 2)
      );
      if (dist < 20) {
        return true;
      }
    }
    return false;
  }

  /**
   * 连接节点
   */
  private connectNodes(): void {
    for (const intersection of this.intersections.values()) {
      const nearbyNodes: string[] = [];

      for (const [nodeId, node] of this.nodes) {
        const dist = Math.sqrt(
          Math.pow(node.position.x - intersection.position.x, 2) +
          Math.pow(node.position.z - intersection.position.z, 2)
        );

        if (dist < 50) {
          nearbyNodes.push(nodeId);
        }
      }

      // 连接路口附近的所有节点
      for (let i = 0; i < nearbyNodes.length; i++) {
        for (let j = i + 1; j < nearbyNodes.length; j++) {
          const nodeA = this.nodes.get(nearbyNodes[i])!;
          const nodeB = this.nodes.get(nearbyNodes[j])!;

          const distance = Math.sqrt(
            Math.pow(nodeA.position.x - nodeB.position.x, 2) +
            Math.pow(nodeA.position.z - nodeB.position.z, 2)
          );

          nodeA.connections.push(nearbyNodes[j]);
          nodeA.weights[nearbyNodes[j]] = distance;

          nodeB.connections.push(nearbyNodes[i]);
          nodeB.weights[nearbyNodes[i]] = distance;
        }
      }
    }
  }

  /**
   * A*寻路算法
   */
  async findPath(request: PathfindingRequest): Promise<Route | null> {
    const startNode = this.findNearestNode(request.start);
    const endNode = this.findNearestNode(request.end);

    if (!startNode || !endNode) {
      logger.warn('Could not find nearest nodes for pathfinding');
      return null;
    }

    // A* 算法实现
    const openSet: PathNode[] = [startNode];
    const cameFrom: Map<string, PathNode> = new Map();
    const gScore: Map<string, number> = new Map();
    const fScore: Map<string, number> = new Map();

    gScore.set(startNode.id, 0);
    fScore.set(startNode.id, this.heuristic(startNode, endNode));

    while (openSet.length > 0) {
      // 找到fScore最小的节点
      openSet.sort((a, b) => (fScore.get(a.id) ?? Infinity) - (fScore.get(b.id) ?? Infinity));
      const current = openSet.shift()!;

      if (current.id === endNode.id) {
        return this.reconstructRoute(cameFrom, current);
      }

      for (const neighborId of current.connections) {
        const neighbor = this.nodes.get(neighborId);
        if (!neighbor) continue;

        const tentativeGScore = (gScore.get(current.id) ?? Infinity) + (current.weights[neighborId] ?? 1);

        if (tentativeGScore < (gScore.get(neighborId) ?? Infinity)) {
          cameFrom.set(neighborId, current);
          gScore.set(neighborId, tentativeGScore);
          fScore.set(neighborId, tentativeGScore + this.heuristic(neighbor, endNode));

          if (!openSet.find(n => n.id === neighborId)) {
            openSet.push(neighbor);
          }
        }
      }
    }

    logger.warn('No path found');
    return null;
  }

  /**
   * 启发式函数（欧几里得距离）
   */
  private heuristic(a: PathNode, b: PathNode): number {
    return Math.sqrt(
      Math.pow(a.position.x - b.position.x, 2) +
      Math.pow(a.position.z - b.position.z, 2)
    );
  }

  /**
   * 重建路径
   */
  private reconstructRoute(cameFrom: Map<string, PathNode>, current: PathNode): Route {
    const nodes: PathNode[] = [current];
    const waypoints: Vector3D[] = [current.position];

    let curr = current;
    while (cameFrom.has(curr.id)) {
      curr = cameFrom.get(curr.id)!;
      nodes.unshift(curr);
      waypoints.unshift(curr.position);
    }

    // 计算总距离
    let totalDistance = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      totalDistance += Math.sqrt(
        Math.pow(waypoints[i + 1].x - waypoints[i].x, 2) +
        Math.pow(waypoints[i + 1].z - waypoints[i].z, 2)
      );
    }

    return {
      nodes,
      segments: [],
      totalDistance,
      estimatedTime: totalDistance / 50, // 假设平均速度50单位/秒
      waypoints,
    };
  }

  /**
   * 找到最近的节点
   */
  private findNearestNode(position: Vector3D): PathNode | null {
    let nearest: PathNode | null = null;
    let minDist = Infinity;

    for (const node of this.nodes.values()) {
      const dist = Math.sqrt(
        Math.pow(node.position.x - position.x, 2) +
        Math.pow(node.position.z - position.z, 2)
      );

      if (dist < minDist) {
        minDist = dist;
        nearest = node;
      }
    }

    return nearest;
  }

  /**
   * 保存道路到数据库
   */
  private async saveRoadsToDatabase(): Promise<void> {
    try {
      const db = getDatabase();

      for (const road of this.roads.values()) {
        await db.road.create({
          data: {
            road_id: road.road_id,
            name: road.name,
            name_en: road.nameEn,
            type: road.type,
            width: road.width,
            lanes: road.lanes,
            speed_limit: road.speedLimit,
            path: road.path,
            length: this.calculateRoadLength(road.path),
            has_lane_markings: road.hasLaneMarkings,
            connected_roads: [],
            metadata: road.metadata,
          },
        });
      }

      logger.info(`Saved ${this.roads.size} roads to database`);
    } catch (error) {
      logger.error('Failed to save roads to database:', error);
    }
  }

  /**
   * 计算道路长度
   */
  private calculateRoadLength(path: Vector3D[]): number {
    let length = 0;
    for (let i = 0; i < path.length - 1; i++) {
      length += Math.sqrt(
        Math.pow(path[i + 1].x - path[i].x, 2) +
        Math.pow(path[i + 1].z - path[i].z, 2)
      );
    }
    return length;
  }

  /**
   * 获取所有道路
   */
  getAllRoads(): RoadConfig[] {
    return Array.from(this.roads.values());
  }

  /**
   * 获取道路
   */
  getRoad(roadId: string): RoadConfig | undefined {
    return this.roads.get(roadId);
  }

  /**
   * 获取所有路口
   */
  getAllIntersections(): Intersection[] {
    return Array.from(this.intersections.values());
  }

  /**
   * 获取渲染数据
   */
  getRenderData(): {
    roads: RoadConfig[];
    intersections: Intersection[];
  } {
    return {
      roads: this.getAllRoads(),
      intersections: this.getAllIntersections(),
    };
  }
}

// 导出单例实例
export const roadNetwork = new RoadNetwork();
