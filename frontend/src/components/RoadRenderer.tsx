// 道路渲染组件 - 使用Three.js渲染北京道路网络

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Group } from 'three';
import { materialFactory, CARTOON_COLORS } from '../utils/threejs/MaterialFactory';

/**
 * 道路数据接口
 */
export interface RoadData {
  road_id: string;
  name: string;
  name_en?: string;
  type: 'highway' | 'main_road' | 'secondary_road' | 'alley' | 'ring_road';
  width: number;
  lanes: number;
  speed_limit: number;
  path: { x: number; y: number; z: number }[];
  has_lane_markings?: boolean;
}

/**
 * 路口数据接口
 */
export interface IntersectionData {
  id: string;
  position: { x: number; y: number; z: number };
  roads: string[];
  isTrafficControlled: boolean;
}

/**
 * 道路渲染器属性
 */
export interface RoadRendererProps {
  roads?: RoadData[];
  intersections?: IntersectionData[];
  onRoadClick?: (road: RoadData) => void;
  enabled?: boolean;
  showMarkings?: boolean;
}

/**
 * 道路渲染组件
 */
export function RoadRenderer({
  roads = [],
  intersections = [],
  onRoadClick,
  enabled = true,
  showMarkings = true,
}: RoadRendererProps) {
  const groupRef = useRef<Group | null>(null);
  const roadsGroupRef = useRef<Group | null>(null);
  const intersectionsGroupRef = useRef<Group | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // 创建道路网络组
    const networkGroup = new THREE.Group();
    networkGroup.name = 'RoadNetworkGroup';

    // 创建道路组
    const roadsGroup = new THREE.Group();
    roadsGroup.name = 'RoadsGroup';
    roadsGroupRef.current = roadsGroup;
    networkGroup.add(roadsGroup);

    // 创建路口组
    const intersectionsGroup = new THREE.Group();
    intersectionsGroup.name = 'IntersectionsGroup';
    intersectionsGroupRef.current = intersectionsGroup;
    networkGroup.add(intersectionsGroup);

    groupRef.current = networkGroup;

    return () => {
      // 清理资源
      networkGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        }
      });
    };
  }, [enabled]);

  // 渲染道路
  useEffect(() => {
    if (!roadsGroupRef.current) return;

    // 清空现有道路
    clearGroup(roadsGroupRef.current);

    // 渲染道路
    roads.forEach((road) => {
      const roadMesh = createRoad(road, showMarkings);
      if (roadMesh) {
        roadsGroupRef.current!.add(roadMesh);
      }
    });
  }, [roads, showMarkings]);

  // 渲染路口
  useEffect(() => {
    if (!intersectionsGroupRef.current) return;

    // 清空现有些路口
    clearGroup(intersectionsGroupRef.current);

    // 渲染路口
    intersections.forEach((intersection) => {
      const intersectionMesh = createIntersection(intersection);
      if (intersectionMesh) {
        intersectionsGroupRef.current!.add(intersectionMesh);
      }
    });
  }, [intersections]);

  /**
   * 创建道路
   */
  function createRoad(roadData: RoadData, markings: boolean): THREE.Group | null {
    if (!roadData.path || roadData.path.length < 2) {
      return null;
    }

    const roadGroup = new THREE.Group();
    roadGroup.name = roadData.name || `Road_${roadData.road_id}`;

    // 转换路径点为THREE.Vector3
    const path = roadData.path.map(p => new THREE.Vector3(p.x, p.y, p.z));

    // 根据道路类型设置颜色
    const roadColor = getRoadColor(roadData.type);

    // 创建道路几何体
    for (let i = 0; i < path.length - 1; i++) {
      const start = path[i];
      const end = path[i + 1];

      // 计算路段
      const segment = createRoadSegment(start, end, roadData, roadColor, markings);
      if (segment) {
        roadGroup.add(segment);
      }
    }

    // 添加点击事件
    if (onRoadClick) {
      roadGroup.userData = { road: roadData, onClick: () => onRoadClick(roadData) };
    }

    return roadGroup;
  }

  /**
   * 创建道路路段
   */
  function createRoadSegment(
    start: THREE.Vector3,
    end: THREE.Vector3,
    roadData: RoadData,
    color: number,
    markings: boolean
  ): THREE.Group | null {
    const segmentGroup = new THREE.Group();

    // 计算长度和方向
    const length = start.distanceTo(end);
    const direction = new THREE.Vector3().subVectors(end, start).normalize();
    const angle = Math.atan2(direction.x, direction.z);

    // 创建道路主体
    const roadGeometry = new THREE.PlaneGeometry(roadData.width, length);
    const roadMaterial = materialFactory.getMaterial({
      type: 'road',
      color,
      flatShading: true,
      roughness: 0.9,
      metalness: 0.0,
    });

    const roadMesh = new THREE.Mesh(roadGeometry, roadMaterial);
    roadMesh.rotation.x = -Math.PI / 2;
    roadMesh.rotation.z = angle;
    roadMesh.position.set(
      (start.x + end.x) / 2,
      0.15,
      (start.z + end.z) / 2
    );
    roadMesh.receiveShadow = true;
    segmentGroup.add(roadMesh);

    // 添加车道标线
    if (markings && roadData.lanes > 1 && roadData.has_lane_markings !== false) {
      addLaneMarkings(segmentGroup, start, end, roadData.width, roadData.lanes, angle);
    }

    // 添加边缘线
    if (markings) {
      addEdgeMarkings(segmentGroup, start, end, roadData.width, angle);
    }

    return segmentGroup;
  }

  /**
   * 添加车道标线
   */
  function addLaneMarkings(
    group: THREE.Group,
    start: THREE.Vector3,
    end: THREE.Vector3,
    width: number,
    lanes: number,
    angle: number
  ): void {
    const lineMaterial = new THREE.MeshBasicMaterial({ color: CARTOON_COLORS.road_line });
    const lineWidth = 0.3;
    const lineLength = 3;

    for (let i = 1; i < lanes; i++) {
      const offset = -width / 2 + (width / lanes) * i;

      // 使用虚线效果
      const segments = Math.ceil(start.distanceTo(end) / lineLength);
      for (let j = 0; j < segments; j += 2) {
        const t = j / segments;
        const nextT = Math.min((j + 1) / segments, 1);

        const lineStart = new THREE.Vector3().lerpVectors(start, end, t);
        const lineEnd = new THREE.Vector3().lerpVectors(start, end, nextT);

        const lineGeometry = new THREE.PlaneGeometry(lineWidth, lineStart.distanceTo(lineEnd));
        const lineMesh = new THREE.Mesh(lineGeometry, lineMaterial);

        const midX = (lineStart.x + lineEnd.x) / 2;
        const midZ = (lineStart.z + lineEnd.z) / 2;

        lineMesh.position.set(midX, 0.16, midZ);
        lineMesh.position.x += offset * Math.cos(angle);
        lineMesh.position.z -= offset * Math.sin(angle);
        lineMesh.rotation.x = -Math.PI / 2;
        lineMesh.rotation.z = angle;

        group.add(lineMesh);
      }
    }
  }

  /**
   * 添加边缘线
   */
  function addEdgeMarkings(
    group: THREE.Group,
    start: THREE.Vector3,
    end: THREE.Vector3,
    width: number,
    angle: number
  ): void {
    const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const lineWidth = 0.4;

    const lineGeometry = new THREE.PlaneGeometry(lineWidth, start.distanceTo(end));

    // 左边缘
    const leftLine = new THREE.Mesh(lineGeometry, lineMaterial.clone());
    const midX = (start.x + end.x) / 2;
    const midZ = (start.z + end.z) / 2;

    leftLine.position.set(midX, 0.16, midZ);
    leftLine.position.x += (width / 2) * Math.cos(angle);
    leftLine.position.z -= (width / 2) * Math.sin(angle);
    leftLine.rotation.x = -Math.PI / 2;
    leftLine.rotation.z = angle;
    group.add(leftLine);

    // 右边缘
    const rightLine = new THREE.Mesh(lineGeometry, lineMaterial.clone());
    rightLine.position.set(midX, 0.16, midZ);
    rightLine.position.x -= (width / 2) * Math.cos(angle);
    rightLine.position.z += (width / 2) * Math.sin(angle);
    rightLine.rotation.x = -Math.PI / 2;
    rightLine.rotation.z = angle;
    group.add(rightLine);
  }

  /**
   * 创建路口
   */
  function createIntersection(intersectionData: IntersectionData): THREE.Object3D | null {
    const intersectionGroup = new THREE.Group();
    intersectionGroup.name = `Intersection_${intersectionData.id}`;

    const pos = intersectionData.position;

    // 创建路口平面（稍大一些）
    const junctionSize = 20;
    const junctionGeometry = new THREE.CircleGeometry(junctionSize, 32);
    const junctionMaterial = materialFactory.getMaterial({
      type: 'road',
      color: CARTOON_COLORS.road,
      flatShading: true,
    });

    const junction = new THREE.Mesh(junctionGeometry, junctionMaterial);
    junction.rotation.x = -Math.PI / 2;
    junction.position.set(pos.x, 0.15, pos.z);
    intersectionGroup.add(junction);

    // 如果是交通控制路口，添加交通信号灯
    if (intersectionData.isTrafficControlled) {
      const trafficLight = createTrafficLight(pos);
      intersectionGroup.add(trafficLight);
    }

    return intersectionGroup;
  }

  /**
   * 创建交通信号灯
   */
  function createTrafficLight(position: { x: number; y: number; z: number }): THREE.Group {
    const lightGroup = new THREE.Group();

    // 灯杆
    const poleGeometry = new THREE.CylinderGeometry(0.2, 0.2, 4, 8);
    const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const pole = new THREE.Mesh(poleGeometry, poleMaterial);
    pole.position.set(position.x + 8, 2, position.z + 8);
    lightGroup.add(pole);

    // 灯箱
    const boxGeometry = new THREE.BoxGeometry(1.5, 0.8, 0.5);
    const boxMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
    const box = new THREE.Mesh(boxGeometry, boxMaterial);
    box.position.set(position.x + 8, 4, position.z + 8);
    lightGroup.add(box);

    // 灯（红色）
    const lightGeometry = new THREE.CircleGeometry(0.2, 16);
    const lightMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const light = new THREE.Mesh(lightGeometry, lightMaterial);
    light.position.set(position.x + 8, 4.1, position.z + 7.7);
    lightGroup.add(light);

    return lightGroup;
  }

  /**
   * 根据道路类型获取颜色
   */
  function getRoadColor(type: RoadData['type']): number {
    switch (type) {
      case 'highway':
        return 0x2d2d2d;
      case 'ring_road':
        return 0x3a3a3a;
      case 'main_road':
        return 0x404040;
      case 'secondary_road':
        return 0x4a4a4a;
      case 'alley':
        return 0x555555;
      default:
        return CARTOON_COLORS.road;
    }
  }

  /**
   * 清空组
   */
  function clearGroup(group: THREE.Group): void {
    while (group.children.length > 0) {
      const child = group.children[0];
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      } else if (child instanceof THREE.Group) {
        clearGroup(child);
      }
      group.remove(child);
    }
  }

  // 组件不渲染任何内容，通过ref获取Three.js对象
  return null;
}

/**
 * 获取道路渲染组的Hook
 */
export function useRoadGroup() {
  const groupRef = useRef<Group | null>(null);

  const setRoadGroup = (group: Group) => {
    groupRef.current = group;
  };

  const getRoadGroup = () => groupRef.current;

  return { setRoadGroup, getRoadGroup };
}

/**
 * 创建道路标记（如限速标志）
 */
export function createRoadSign(
  position: THREE.Vector3,
  type: 'speed_limit' | 'stop' | 'yield' | 'no_entry',
  _value?: number
): THREE.Group {
  const signGroup = new THREE.Group();

  // 灯杆
  const poleGeometry = new THREE.CylinderGeometry(0.1, 0.1, 3, 8);
  const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x666666 });
  const pole = new THREE.Mesh(poleGeometry, poleMaterial);
  pole.position.copy(position);
  pole.position.y = 1.5;
  signGroup.add(pole);

  // 标志牌
  let signGeometry: THREE.BufferGeometry;
  let signMaterial: THREE.Material;

  switch (type) {
    case 'speed_limit':
      signGeometry = new THREE.CircleGeometry(0.5, 32);
      signMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
      break;
    case 'stop':
      signGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.1);
      signMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
      break;
    case 'yield':
      signGeometry = new THREE.ConeGeometry(0.4, 0.7, 3);
      signMaterial = new THREE.MeshStandardMaterial({ color: 0xffcc00 });
      break;
    case 'no_entry':
      signGeometry = new THREE.CircleGeometry(0.5, 32);
      signMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
      break;
    default:
      signGeometry = new THREE.CircleGeometry(0.5, 32);
      signMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
  }

  const sign = new THREE.Mesh(signGeometry, signMaterial);
  sign.position.copy(position);
  sign.position.y = 3.2;

  if (type === 'yield') {
    sign.rotation.x = Math.PI / 2;
  } else {
    sign.rotation.y = Math.PI / 2;
  }

  signGroup.add(sign);

  return signGroup;
}
