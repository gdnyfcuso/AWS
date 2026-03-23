// 车辆渲染组件 - 使用Three.js渲染卡通风格车辆

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Group, Object3D } from 'three';
import { geometryGenerator } from '../utils/threejs/GeometryGenerator';
import { CARTOON_COLORS } from '../utils/threejs/MaterialFactory';

/**
 * 车辆数据接口
 */
export interface VehicleData {
  vehicle_id: string;
  name: string;
  type: 'car' | 'bus' | 'truck' | 'motorcycle' | 'bicycle' | 'taxi';
  position: { x: number; y: number; z: number };
  rotation: number;
  speed: number;
  capacity: number;
  maxSpeed: number;
  color: string;
  status: 'parked' | 'moving' | 'stopped' | 'idle';
  currentDriverId?: string;
}

/**
 * 车辆类型配置
 */
export interface VehicleTypeConfig {
  type: VehicleData['type'];
  bodyShape: 'box' | 'rounded' | 'sedan' | 'suv';
  size: { length: number; width: number; height: number };
  hasRoof: boolean;
  windowConfig: {
    front: boolean;
    rear: boolean;
    sides: boolean;
  };
  wheelPositions: THREE.Vector3[];
}

/**
 * 车辆渲染器属性
 */
export interface VehicleRendererProps {
  vehicles?: VehicleData[];
  onVehicleClick?: (vehicle: VehicleData) => void;
  enabled?: boolean;
  showDrivers?: boolean;
  animationEnabled?: boolean;
}

/**
 * 车辆类型定义
 */
const VEHICLE_TYPE_CONFIGS: Record<VehicleData['type'], VehicleTypeConfig> = {
  car: {
    type: 'car',
    bodyShape: 'sedan',
    size: { length: 8, width: 4, height: 3 },
    hasRoof: true,
    windowConfig: { front: true, rear: true, sides: true },
    wheelPositions: [
      new THREE.Vector3(-3, -1, 2),
      new THREE.Vector3(3, -1, 2),
      new THREE.Vector3(-3, -1, -2),
      new THREE.Vector3(3, -1, -2),
    ],
  },
  bus: {
    type: 'bus',
    bodyShape: 'box',
    size: { length: 16, width: 5, height: 5 },
    hasRoof: true,
    windowConfig: { front: true, rear: true, sides: true },
    wheelPositions: [
      new THREE.Vector3(-5, -1, 2),
      new THREE.Vector3(5, -1, 2),
      new THREE.Vector3(-5, -1, -2),
      new THREE.Vector3(5, -1, -2),
    ],
  },
  truck: {
    type: 'truck',
    bodyShape: 'box',
    size: { length: 14, width: 5, height: 6 },
    hasRoof: true,
    windowConfig: { front: true, rear: false, sides: true },
    wheelPositions: [
      new THREE.Vector3(-4, -1, 2),
      new THREE.Vector3(4, -1, 2),
      new THREE.Vector3(-4, -1, -2),
      new THREE.Vector3(4, -1, -2),
    ],
  },
  motorcycle: {
    type: 'motorcycle',
    bodyShape: 'rounded',
    size: { length: 4, width: 1.5, height: 2 },
    hasRoof: false,
    windowConfig: { front: false, rear: false, sides: false },
    wheelPositions: [
      new THREE.Vector3(-1.5, -0.5, 0),
      new THREE.Vector3(1.5, -0.5, 0),
    ],
  },
  bicycle: {
    type: 'bicycle',
    bodyShape: 'rounded',
    size: { length: 3, width: 1, height: 2 },
    hasRoof: false,
    windowConfig: { front: false, rear: false, sides: false },
    wheelPositions: [
      new THREE.Vector3(-1, -0.5, 0),
      new THREE.Vector3(1, -0.5, 0),
    ],
  },
  taxi: {
    type: 'taxi',
    bodyShape: 'sedan',
    size: { length: 8, width: 4, height: 3 },
    hasRoof: true,
    windowConfig: { front: true, rear: true, sides: true },
    wheelPositions: [
      new THREE.Vector3(-3, -1, 2),
      new THREE.Vector3(3, -1, 2),
      new THREE.Vector3(-3, -1, -2),
      new THREE.Vector3(3, -1, -2),
    ],
  },
};

/**
 * 车辆渲染组件
 */
export function VehicleRenderer({
  vehicles = [],
  onVehicleClick,
  enabled = true,
  showDrivers = true,
  animationEnabled = true,
}: VehicleRendererProps) {
  const groupRef = useRef<Group | null>(null);
  const vehicleMeshesRef = useRef<Map<string, Object3D | null>>(new Map());
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    if (!enabled) return;

    // 创建车辆组
    const vehicleGroup = new THREE.Group();
    vehicleGroup.name = 'VehicleGroup';
    groupRef.current = vehicleGroup;

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      // 清理资源
      vehicleGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        }
      });
    };
  }, [enabled]);

  // 渲染车辆
  useEffect(() => {
    if (!groupRef.current) return;

    // 获取当前车辆ID集合
    const currentIds = new Set(vehicles.map(v => v.vehicle_id));

    // 移除不存在的车辆
    const existingIds = vehicleMeshesRef.current.keys();
    for (const id of existingIds) {
      if (!currentIds.has(id)) {
        const mesh = vehicleMeshesRef.current.get(id);
        if (mesh && groupRef.current) {
          groupRef.current.remove(mesh);
          // 清理资源
          mesh.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.geometry.dispose();
              if (child.material instanceof THREE.Material) {
                child.material.dispose();
              }
            }
          });
        }
        vehicleMeshesRef.current.delete(id);
      }
    }

    // 更新或创建车辆
    vehicles.forEach((vehicle) => {
      let mesh = vehicleMeshesRef.current.get(vehicle.vehicle_id);

      if (!mesh) {
        // 创建新车辆
        mesh = createVehicleMesh(vehicle);
        if (mesh && groupRef.current) {
          groupRef.current.add(mesh);
          vehicleMeshesRef.current.set(vehicle.vehicle_id, mesh);
        }
      } else {
        // 更新现有车辆位置和状态
        updateVehicleMesh(mesh, vehicle);
      }
    });
  }, [vehicles]);

  // 动画循环
  useEffect(() => {
    if (!animationEnabled || !enabled) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    let lastTime = performance.now();

    function animate(time: number) {
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      // 更新所有移动车辆
      vehicles.forEach((vehicle) => {
        if (vehicle.status === 'moving' && vehicle.speed > 0) {
          const mesh = vehicleMeshesRef.current.get(vehicle.vehicle_id);
          if (mesh) {
            // 根据速度和方向更新位置
            const moveDistance = vehicle.speed * delta * 0.5;
            mesh.position.x += Math.cos(vehicle.rotation) * moveDistance;
            mesh.position.z += Math.sin(vehicle.rotation) * moveDistance;
          }
        }
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    }

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [vehicles, animationEnabled, enabled]);

  /**
   * 创建车辆网格
   */
  function createVehicleMesh(vehicle: VehicleData): Object3D | null {
    const typeConfig = VEHICLE_TYPE_CONFIGS[vehicle.type];
    if (!typeConfig) return null;

    const vehicleMesh = geometryGenerator.createVehicle({
      type: vehicle.type,
      bodyShape: typeConfig.bodyShape,
      size: typeConfig.size,
      hasRoof: typeConfig.hasRoof,
      windowConfig: typeConfig.windowConfig,
      wheelPositions: typeConfig.wheelPositions,
      color: vehicle.color,
    });

    vehicleMesh.position.set(vehicle.position.x, vehicle.position.y, vehicle.position.z);
    vehicleMesh.rotation.y = vehicle.rotation;

    vehicleMesh.name = vehicle.name || `Vehicle_${vehicle.vehicle_id}`;
    vehicleMesh.castShadow = true;
    vehicleMesh.receiveShadow = true;

    // 添加点击事件
    if (onVehicleClick) {
      vehicleMesh.userData = { vehicle, onClick: () => onVehicleClick(vehicle) };
    }

    // 添加状态指示器
    if (showDrivers && vehicle.currentDriverId) {
      const driverIndicator = createDriverIndicator(vehicle.type, typeConfig.size);
      driverIndicator.position.y = typeConfig.size.height + 1;
      vehicleMesh.add(driverIndicator);
    }

    // 添加状态指示灯
    if (vehicle.status === 'moving') {
      const movingLight = createStatusLight(0x00ff00);
      movingLight.position.set(0, typeConfig.size.height + 0.5, 0);
      vehicleMesh.add(movingLight);
    }

    return vehicleMesh;
  }

  /**
   * 更新车辆网格
   */
  function updateVehicleMesh(mesh: Object3D, vehicle: VehicleData): void {
    mesh.position.set(vehicle.position.x, vehicle.position.y, vehicle.position.z);
    mesh.rotation.y = vehicle.rotation;
  }

  /**
   * 创建驾驶员指示器
   */
  function createDriverIndicator(vehicleType: VehicleData['type'], _size: { length: number; width: number; height: number }): THREE.Object3D {
    const indicatorGroup = new THREE.Group();

    // 简单的人物形状
    const bodyGeometry = new THREE.CapsuleGeometry(0.3, 0.8, 4, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x4a90d9 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.7;
    indicatorGroup.add(body);

    // 头部
    const headGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0xffdbac });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.4;
    indicatorGroup.add(head);

    // 缩放根据车辆类型
    const scale = vehicleType === 'motorcycle' || vehicleType === 'bicycle' ? 0.7 : 1;
    indicatorGroup.scale.set(scale, scale, scale);

    return indicatorGroup;
  }

  /**
   * 创建状态指示灯
   */
  function createStatusLight(color: number): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(0.2, 8, 8);
    const material = new THREE.MeshBasicMaterial({ color });
    return new THREE.Mesh(geometry, material);
  }

  // 组件不渲染任何内容，通过ref获取Three.js对象
  return null;
}

/**
 * 获取车辆渲染组的Hook
 */
export function useVehicleGroup() {
  const groupRef = useRef<Group | null>(null);

  const setVehicleGroup = (group: Group) => {
    groupRef.current = group;
  };

  const getVehicleGroup = () => groupRef.current;

  return { setVehicleGroup, getVehicleGroup };
}

/**
 * 获取车辆类型配置
 */
export function getVehicleTypeConfig(type: VehicleData['type']): VehicleTypeConfig | undefined {
  return VEHICLE_TYPE_CONFIGS[type];
}

/**
 * 获取所有车辆类型
 */
export function getAllVehicleTypes(): VehicleData['type'][] {
  return Object.keys(VEHICLE_TYPE_CONFIGS) as VehicleData['type'][];
}

/**
 * 随机生成车辆颜色
 */
export function getRandomVehicleColor(): string {
  const colors = [
    CARTOON_COLORS.car_red,
    CARTOON_COLORS.car_blue,
    CARTOON_COLORS.car_yellow,
    CARTOON_COLORS.car_green,
    CARTOON_COLORS.car_purple,
    CARTOON_COLORS.car_orange,
    CARTOON_COLORS.car_pink,
  ];
  const color = colors[Math.floor(Math.random() * colors.length)];
  return '#' + color.toString(16).padStart(6, '0');
}

/**
 * 创建车辆选中效果
 */
export function createVehicleSelectionEffect(vehicle: VehicleData): THREE.Object3D {
  const effectGroup = new THREE.Group();

  const typeConfig = VEHICLE_TYPE_CONFIGS[vehicle.type];
  if (!typeConfig) return effectGroup;

  // 创建高亮环
  const ringGeometry = new THREE.RingGeometry(
    Math.max(typeConfig.size.length, typeConfig.size.width) / 2 + 0.5,
    Math.max(typeConfig.size.length, typeConfig.size.width) / 2 + 1,
    32
  );
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0xffff00,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.1;
  effectGroup.add(ring);

  return effectGroup;
}
