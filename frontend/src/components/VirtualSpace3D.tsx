// 3D 虚拟空间查看器 - 使用 Three.js
// 集成北京地形、道路网络和车辆系统

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
// @ts-ignore - OrbitControls import
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { getApiUrl } from '../utils/api';
import { TerrainFeatureData } from './TerrainRenderer';
import { RoadData, IntersectionData } from './RoadRenderer';
import { VehicleData } from './VehicleRenderer';
import { geometryGenerator } from '../utils/threejs/GeometryGenerator';
import { materialFactory, CARTOON_COLORS } from '../utils/threejs/MaterialFactory';

interface Agent3D {
  agent_id: string;
  agent_name: string;
  x: number;
  y: number;
  z: number;
  energy: number;
  mood: string;
  status: string;
}

interface Building3D {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  color: string;
}

interface River3D {
  id: string;
  name: string;
  path: { x: number; y: number; z: number }[];
  width: number;
}

interface CityBounds {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
}

interface VirtualSpace3DProps {
  agents: Agent3D[];
  buildings: Building3D[];
  onAgentClick?: (agentId: string) => void;
  currentSelectedAgentId?: string | null; // 外部传入选中的 Agent ID
  viewMode?: 'first-person' | 'second-person' | 'third-person'; // 视角模式
  onViewModeChange?: (mode: 'first-person' | 'second-person' | 'third-person') => void;
  // 新增：地形、道路、车辆数据
  terrainFeatures?: TerrainFeatureData[];
  roads?: RoadData[];
  intersections?: IntersectionData[];
  vehicles?: VehicleData[];
  // 新增：城市特定的数据
  rivers?: River3D[];
  cityBounds?: CityBounds;
  cityCenter?: { lat: number; lng: number };
  onVehicleClick?: (vehicle: VehicleData) => void;
  enableTerrain?: boolean;
  enableRoads?: boolean;
  enableVehicles?: boolean;
  // 全屏控制
  externalIsFullscreen?: boolean;
  onFullscreenChange?: (externalIsFullscreen: boolean) => void;
  // 移动端检测
  isMobile?: boolean;
  isTouchDevice?: boolean;
}

// 视角模式类型
type ViewMode = 'first-person' | 'second-person' | 'third-person';

// 根据道路类型获取颜色
function getRoadColor(type: string): number {
  // 处理空或未定义的 type
  if (!type) {
    console.warn('[VirtualSpace3D] Road type is missing, using default color');
    return CARTOON_COLORS.road;
  }

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
      console.warn(`[VirtualSpace3D] Unknown road type: "${type}", using default color`);
      return CARTOON_COLORS.road;
  }
}

// 添加车道标线
function addLaneMarkings(
  group: THREE.Group,
  start: THREE.Vector3,
  end: THREE.Vector3,
  width: number,
  lanes: number,
  angle: number
): void {
  const lineWidth = 0.3;
  const lineLength = 3;

  for (let i = 1; i < lanes; i++) {
    const offset = -width / 2 + (width / lanes) * i;

    const segments = Math.ceil(start.distanceTo(end) / lineLength);
    for (let j = 0; j < segments; j += 2) {
      const t = j / segments;
      const nextT = Math.min((j + 1) / segments, 1);

      const lineStart = new THREE.Vector3().lerpVectors(start, end, t);
      const lineEnd = new THREE.Vector3().lerpVectors(start, end, nextT);

      const lineGeometry = new THREE.PlaneGeometry(lineWidth, lineStart.distanceTo(lineEnd));
      const lineMaterial = new THREE.MeshBasicMaterial({ color: CARTOON_COLORS.road_line });
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

// 添加边缘线
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

// 车辆类型配置
const VEHICLE_TYPE_CONFIGS: Record<string, {
  bodyShape: 'box' | 'rounded' | 'sedan' | 'suv';
  size: { length: number; width: number; height: number };
  hasRoof: boolean;
  windowConfig: { front: boolean; rear: boolean; sides: boolean };
  wheelPositions: THREE.Vector3[];
}> = {
  car: {
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

// 创建车辆网格
function createVehicleMesh(vehicle: VehicleData): THREE.Group | null {
  const typeConfig = VEHICLE_TYPE_CONFIGS[vehicle.type];
  if (!typeConfig) return null;

  const vehicleGroup = geometryGenerator.createVehicle({
    type: vehicle.type,
    bodyShape: typeConfig.bodyShape,
    size: typeConfig.size,
    hasRoof: typeConfig.hasRoof,
    windowConfig: typeConfig.windowConfig,
    wheelPositions: typeConfig.wheelPositions,
    color: vehicle.color,
  });

  vehicleGroup.position.set(vehicle.position.x, vehicle.position.y, vehicle.position.z);
  vehicleGroup.rotation.y = vehicle.rotation;

  vehicleGroup.name = vehicle.name || `Vehicle_${vehicle.vehicle_id}`;
  vehicleGroup.castShadow = true;
  vehicleGroup.receiveShadow = true;

  vehicleGroup.userData = { vehicle };

  return vehicleGroup;
}

const moodColors: Record<string, string> = {
  happy: '#22c55e',
  sad: '#3b82f6',
  angry: '#ef4444',
  neutral: '#6b7280',
  focused: '#8b5cf6',
  relaxed: '#06b6d4',
};

export function VirtualSpace3D({
  agents,
  buildings,
  onAgentClick,
  currentSelectedAgentId,
  viewMode: externalViewMode,
  onViewModeChange,
  terrainFeatures = [],
  roads = [],
  intersections = [],
  vehicles = [],
  rivers = [],
  cityBounds,
  cityCenter,
  onVehicleClick,
  enableTerrain = true,
  enableRoads = true,
  enableVehicles = true,
  externalIsFullscreen: externalIsFullscreen = false,
  onFullscreenChange,
  isMobile = false,
  isTouchDevice: _isTouchDevice = false,
}: VirtualSpace3DProps) {
  // 生成唯一实例ID用于调试
  const instanceId = useRef<string>(Math.random().toString(36).substring(7));

  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<any>(null);
  const agentMeshesRef = useRef<THREE.Group>(new THREE.Group());
  const isAnimatingRef = useRef(false);
  // 存储每个 Agent 的目标位置，用于平滑移动
  const agentTargetPositionsRef = useRef<Map<string, { x: number; y: number; z: number }>>(new Map());
  // 存储 Agent 是否正在移动
  const agentIsMovingRef = useRef<Map<string, boolean>>(new Map());

  // 键盘控制状态
  const keysPressedRef = useRef<Set<string>>(new Set());
  // Agent 跳跃物理状态: velocityY (Y轴速度), isJumping (是否跳跃中), groundY (地面高度)
  const agentPhysicsRef = useRef<Map<string, { velocityY: number; isJumping: boolean; groundY: number }>>(new Map());
  // Agent 旋转角度（用于键盘控制转向）
  const agentRotationsRef = useRef<Map<string, number>>(new Map());
  // Agent 交流通道
  const communicationChannelsRef = useRef<Map<string, THREE.Line>>(new Map());
  const COMMUNICATION_RANGE = 10; // 交流范围（米）

  // 统一的碰撞系统
  interface Collider {
    type: 'building' | 'mountain' | 'hill' | 'water' | 'river' | 'vehicle';
    x: number;
    z: number;
    width: number;
    depth: number;
    height?: number;  // 用于判断能否跳上
    passableWithJump?: boolean;  // 是否可以跳上去
  }
  const collidersRef = useRef<Collider[]>([]);

  const [currentViewMode, setCurrentViewMode] = useState<ViewMode>('third-person');
  // 使用 ref 存储最新的视角模式，避免闭包陷阱
  const viewModeRef = useRef<ViewMode>(externalViewMode || 'third-person');
  // 当前追踪的 Agent（用于第一/第二人称视角）
  const trackedAgentRef = useRef<string | null>(null);
  const [webGLError, setWebGLError] = useState(false);
  const [internalSelectedAgent, setInternalSelectedAgent] = useState<string | null>(null);
  const [sceneReady, setSceneReady] = useState(false);
  const [initAttempted, setInitAttempted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 使用外部传入的currentSelectedAgentId，如果没有则使用内部状态
  const currentSelectedAgent = currentSelectedAgentId || internalSelectedAgent;

  // 组件挂载日志
  console.log(`[VirtualSpace3D#${instanceId.current}] Component mount/props:`, {
    buildingsCount: buildings.length,
    roadsCount: roads.length,
    intersectionsCount: intersections.length,
    riversCount: rivers.length,
    terrainFeaturesCount: terrainFeatures.length,
    enableTerrain,
    cityBounds: !!cityBounds,
  });

  // 组件挂载时重置版本引用，确保首次渲染会执行
  useEffect(() => {
    console.log(`[VirtualSpace3D#${instanceId.current}] Resetting version refs on mount`);
    renderedRoadsRef.current = '';
    renderedBuildingsRef.current = '';
  }, []);

  // 使用 ref 存储当前选中的 Agent，避免动画循环闭包问题

  // 使用 ref 存储当前选中的 Agent，避免动画循环闭包问题
  const currentSelectedAgentRef = useRef<string | null>(currentSelectedAgent);

  // 追踪已渲染的道路数据版本，防止重复渲染
  const renderedRoadsRef = useRef<string>('');
  const renderedBuildingsRef = useRef<string>('');

  // 当 currentSelectedAgent 变化时，更新 ref
  useEffect(() => {
    currentSelectedAgentRef.current = currentSelectedAgent;
  }, [currentSelectedAgent]);

  // 当外部currentSelectedAgentId变化时，同步内部状态
  useEffect(() => {
    if (currentSelectedAgentId) {
      setInternalSelectedAgent(currentSelectedAgentId);
    }
  }, [currentSelectedAgentId]);

  // 使用外部传入的视角模式，如果没有则使用内部状态
  const viewMode = externalViewMode || currentViewMode;

  // 全屏切换函数 - 使用真正的浏览器全屏 API
  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      // 进入全屏模式
      container.requestFullscreen().then(() => {
        if (onFullscreenChange) {
          onFullscreenChange(true);
        }
      }).catch(err => {
        console.error('Failed to enter fullscreen:', err);
      });
    } else {
      // 退出全屏模式
      document.exitFullscreen().then(() => {
        if (onFullscreenChange) {
          onFullscreenChange(false);
        }
      });
    }
  };

  // 更新 viewModeRef 以保持最新值
  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

  // 全屏模式下监听 ESC 键退出
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      console.log('Fullscreen changed:', isCurrentlyFullscreen);
      setIsFullscreen(isCurrentlyFullscreen);
      if (onFullscreenChange) {
        onFullscreenChange(isCurrentlyFullscreen);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [onFullscreenChange]);

  // 键盘控制 - Agent 移动和跳跃
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC键退出全屏
      if (e.key === 'Escape' && document.fullscreenElement) {
        return; // 让fullscreenchange事件处理
      }

      // 阻止方向键和空格键的默认滚动行为
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      keysPressedRef.current.add(e.key);

      // 调试日志
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        console.log(`[Keyboard] ${e.key} pressed, selectedAgent: ${currentSelectedAgentRef.current}`);
      }

      // 空格键跳跃 - 使用 ref 避免闭包问题
      if (e.key === ' ' && currentSelectedAgentRef.current) {
        const physics = agentPhysicsRef.current.get(currentSelectedAgentRef.current);
        if (physics && !physics.isJumping) {
          // 开始跳跃
          agentPhysicsRef.current.set(currentSelectedAgentRef.current, {
            ...physics,
            velocityY: 15, // 初始跳跃速度
            isJumping: true,
          });
          console.log(`[Keyboard] Space pressed, jumping! selectedAgent: ${currentSelectedAgentRef.current}`);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressedRef.current.delete(e.key);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        console.log(`[Keyboard] ${e.key} released`);
      }
    };

    console.log('[Keyboard] Event listeners registered');
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      console.log('[Keyboard] Event listeners removed');
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [currentSelectedAgent]);

  // 检查 WebGL 支持
  useEffect(() => {
    // 只在浏览器环境中检查
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

      if (!gl) {
        console.warn('[VirtualSpace3D] WebGL not supported');
        setWebGLError(true);
      } else {
        console.log('[VirtualSpace3D] WebGL is supported:', {
          webgl2: !!canvas.getContext('webgl2'),
          webgl1: !!canvas.getContext('webgl'),
          renderer: gl.getParameter?.(gl.RENDERER),
        });
      }
    } catch (e) {
      console.error('[VirtualSpace3D] WebGL check failed:', e);
      setWebGLError(true);
    }
  }, []);

  // 初始化 Three.js 场景 - 只运行一次
  useEffect(() => {
    // 如果WebGL不支持，直接返回
    if (webGLError) {
      console.warn('[VirtualSpace3D] Skipping initialization due to WebGL error');
      return;
    }

    // 如果已经初始化过，直接返回
    if (sceneReady || initAttempted) return;

    if (!containerRef.current) {
      console.warn('[VirtualSpace3D] Container ref not ready');
      return;
    }

    setInitAttempted(true);

    try {
      const container = containerRef.current;
      let width = container.offsetWidth;
      let height = container.offsetHeight;

      // 如果容器尺寸为0，等待DOM更新
      if (width === 0 || height === 0) {
        const timer = setTimeout(() => {
          if (container.offsetWidth > 0 && container.offsetHeight > 0) {
            setSceneReady(false); // 触发重新初始化
          }
        }, 100);
        return () => clearTimeout(timer);
      }

      // 创建场景
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x87CEEB); // 天空蓝
      sceneRef.current = scene;

      // 根据城市边界动态计算相机参数
      // 如果提供了城市边界，使用它来计算合适的相机位置和far值
      let cameraPos: { x: number; y: number; z: number };
      let cameraFar: number;
      let groundSize: number;

      console.log(`[VirtualSpace3D] Camera calculation: cityBounds=`, cityBounds);

      if (cityBounds && cityBounds.min && cityBounds.max) {
        // 计算城市的实际尺寸（米）
        const cityWidth = cityBounds.max.x - cityBounds.min.x;
        const cityDepth = cityBounds.max.z - cityBounds.min.z;
        const maxDimension = Math.max(cityWidth, cityDepth);

        // 相机距离设置为最大尺寸的80%
        const cameraDistance = Math.max(maxDimension * 0.8, 500);
        cameraFar = maxDimension * 3; // far值设为最大尺寸的3倍，确保能看到所有内容

        // 相机位置：从东南方向俯视城市
        cameraPos = {
          x: cameraDistance * 0.7,
          y: cameraDistance * 0.5,
          z: cameraDistance * 0.7,
        };

        // 地面尺寸略大于城市边界
        groundSize = maxDimension * 1.2;

        console.log(`[VirtualSpace3D] Using city bounds:`, {
          cityWidth: cityWidth.toFixed(0),
          cityDepth: cityDepth.toFixed(0),
          maxDimension: maxDimension.toFixed(0),
          cameraDistance: cameraDistance.toFixed(0),
          cameraFar: cameraFar.toFixed(0),
          groundSize: groundSize.toFixed(0),
        });
      } else {
        // 默认配置 - 根据地形特征计算合适的相机位置
        let sceneCenter = { x: 0, y: 0, z: 0 };
        let maxDimension = 2000; // 默认范围

        if (terrainFeatures && terrainFeatures.length > 0) {
          // 计算所有地形特征的边界
          let minX = Infinity, maxX = -Infinity;
          let minZ = Infinity, maxZ = -Infinity;

          terrainFeatures.forEach(f => {
            const halfWidth = (f.size?.width || 0) / 2;
            const halfDepth = (f.size?.depth || 0) / 2;
            minX = Math.min(minX, f.position.x - halfWidth);
            maxX = Math.max(maxX, f.position.x + halfWidth);
            minZ = Math.min(minZ, f.position.z - halfDepth);
            maxZ = Math.max(maxZ, f.position.z + halfDepth);
          });

          // 地形中心
          sceneCenter = {
            x: (minX + maxX) / 2,
            y: 0,
            z: (minZ + maxZ) / 2
          };

          // 计算场景尺寸
          const sceneWidth = maxX - minX;
          const sceneDepth = maxZ - minZ;
          maxDimension = Math.max(sceneWidth, sceneDepth, 1000);

          console.log(`[VirtualSpace3D] Calculated terrain bounds:`, {
            minX: minX.toFixed(0), maxX: maxX.toFixed(0),
            minZ: minZ.toFixed(0), maxZ: maxZ.toFixed(0),
            center: sceneCenter,
            maxDimension: maxDimension.toFixed(0)
          });
        }

        // 相机距离基于场景尺寸
        const cameraDistance = maxDimension * 0.8;
        cameraPos = {
          x: sceneCenter.x + cameraDistance * 0.5,
          y: cameraDistance * 0.4,
          z: sceneCenter.z + cameraDistance * 0.5
        };
        cameraFar = maxDimension * 3;
        groundSize = maxDimension * 1.5;

        console.log(`[VirtualSpace3D] Using terrain-based configuration:`, {
          sceneCenter,
          cameraDistance: cameraDistance.toFixed(0),
          cameraFar: cameraFar.toFixed(0),
          groundSize: groundSize.toFixed(0)
        });
      }

      // 禁用雾效，保持视野清晰
      // scene.fog = new THREE.Fog(0x87CEEB, fogStart, fogEnd);
      scene.fog = null;

      // 计算相机目标点（城市中心或地形中心）
      let lookAtTarget = { x: 0, y: 0, z: 0 };
      if (cityBounds && cityBounds.min && cityBounds.max) {
        lookAtTarget = {
          x: (cityBounds.min.x + cityBounds.max.x) / 2,
          y: 0,
          z: (cityBounds.min.z + cityBounds.max.z) / 2
        };
      } else if (terrainFeatures && terrainFeatures.length > 0) {
        // 使用上面计算的地形中心
        let minX = Infinity, maxX = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;
        terrainFeatures.forEach(f => {
          const halfWidth = (f.size?.width || 0) / 2;
          const halfDepth = (f.size?.depth || 0) / 2;
          minX = Math.min(minX, f.position.x - halfWidth);
          maxX = Math.max(maxX, f.position.x + halfWidth);
          minZ = Math.min(minZ, f.position.z - halfDepth);
          maxZ = Math.max(maxZ, f.position.z + halfDepth);
        });
        lookAtTarget = {
          x: (minX + maxX) / 2,
          y: 0,
          z: (minZ + maxZ) / 2
        };
      }

      // 创建相机
      const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, cameraFar);
      camera.position.set(cameraPos.x, cameraPos.y, cameraPos.z);
      camera.lookAt(lookAtTarget.x, lookAtTarget.y, lookAtTarget.z);
      cameraRef.current = camera;

      // 创建渲染器
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
        failIfMajorPerformanceCaveat: false,  // 在性能较低的设备上也尝试创建
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min((window.devicePixelRatio || 1), 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      renderer.setClearColor(0x87CEEB, 1);
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      console.log('[VirtualSpace3D] Renderer created successfully');

      // 添加轨道控制器 - 根据城市范围动态设置限制
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      // minDistance 和 maxDistance 应该基于场景规模
      const minDist = cityBounds ? 20 : 100;
      const maxDist = cityBounds ? cameraFar * 0.4 : 2000; // 最大距离为far值的40%
      controls.minDistance = minDist;
      controls.maxDistance = maxDist;
      controls.maxPolarAngle = Math.PI / 2 - 0.1;
      controls.target.set(lookAtTarget.x, lookAtTarget.y, lookAtTarget.z);
      controlsRef.current = controls;

      console.log(`[VirtualSpace3D] OrbitControls: minDistance=${minDist}, maxDistance=${maxDist.toFixed(0)}`);

      // 添加光源 - 扩大光照范围
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(200, 300, 200);
      directionalLight.castShadow = true;
      directionalLight.shadow.mapSize.width = 4096;
      directionalLight.shadow.mapSize.height = 4096;
      directionalLight.shadow.camera.near = 1;
      // 根据城市范围动态设置阴影相机边界
      const shadowExtent = cityBounds ? (groundSize / 2) : 500;
      directionalLight.shadow.camera.far = Math.max(shadowExtent * 2, 1000);
      directionalLight.shadow.camera.left = -shadowExtent;
      directionalLight.shadow.camera.right = shadowExtent;
      directionalLight.shadow.camera.top = shadowExtent;
      directionalLight.shadow.camera.bottom = -shadowExtent;
      scene.add(directionalLight);

      // 添加半球光（天空和地面反射）
      const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x7cfc00, 0.4);
      scene.add(hemiLight);

      // 创建渲染层组
      const terrainGroup = new THREE.Group();
      terrainGroup.name = 'TerrainGroup';
      scene.add(terrainGroup);
      (sceneRef.current as any).terrainGroup = terrainGroup;

      const roadsGroup = new THREE.Group();
      roadsGroup.name = 'RoadsGroup';
      scene.add(roadsGroup);
      (sceneRef.current as any).roadsGroup = roadsGroup;

      const riversGroup = new THREE.Group();
      riversGroup.name = 'RiversGroup';
      scene.add(riversGroup);
      (sceneRef.current as any).riversGroup = riversGroup;

      const vehiclesGroup = new THREE.Group();
      vehiclesGroup.name = 'VehiclesGroup';
      scene.add(vehiclesGroup);
      (sceneRef.current as any).vehiclesGroup = vehiclesGroup;

      // 创建建筑物组
      const buildingsGroup = new THREE.Group();
      buildingsGroup.name = 'BuildingsGroup';
      scene.add(buildingsGroup);
      (sceneRef.current as any).buildingsGroup = buildingsGroup;

      // 添加基础地面（绿色草地）作为视觉参考
      // 地面尺寸已在上面根据城市边界计算
      const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize);
      const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x7cfc00,
        roughness: 0.9,
        metalness: 0
      });
      const ground = new THREE.Mesh(groundGeometry, groundMaterial);
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.1;
      ground.receiveShadow = true;
      ground.name = 'Ground';
      scene.add(ground);

      console.log(`[VirtualSpace3D] Ground: ${groundSize.toFixed(0)}m x ${groundSize.toFixed(0)}m`);

      // 添加 Agent 组
      agentMeshesRef.current = new THREE.Group();
      scene.add(agentMeshesRef.current);

      setSceneReady(true);

    } catch (error) {
      console.error('Failed to initialize Three.js:', error);
      setWebGLError(true);
    }

    // 清理函数 - 组件卸载时执行完整清理
    return () => {
      console.log(`[VirtualSpace3D#${instanceId.current}] Cleanup - disposing resources`);

      // 先停止动画循环
      isAnimatingRef.current = false;

      // 先清理各个组的内容（确保几何体和材质被释放）
      if (sceneRef.current) {
        const groups = ['roadsGroup', 'buildingsGroup', 'riversGroup', 'vehiclesGroup', 'terrainGroup', 'agentsGroup'];
        groups.forEach(groupName => {
          const group = (sceneRef.current as any)[groupName];
          if (group) {
            console.log(`[VirtualSpace3D] Cleaning up ${groupName}: ${group.children.length} children`);
            // 递归清理组内所有对象
            group.traverse((object: any) => {
              if (object instanceof THREE.Mesh) {
                if (object.geometry) {
                  object.geometry.dispose();
                }
                if (object.material) {
                  if (Array.isArray(object.material)) {
                    object.material.forEach((material: any) => material.dispose());
                  } else {
                    object.material.dispose();
                  }
                }
              }
            });
            // 清空组的子元素
            while (group.children.length > 0) {
              group.remove(group.children[0]);
            }
            // 显式从场景中移除组
            sceneRef.current.remove(group);
            // 清空引用
            (sceneRef.current as any)[groupName] = null;
          }
        });

        // 额外检查：移除场景中的所有剩余对象
        const objectsToRemove: any[] = [];
        sceneRef.current.traverse((object: any) => {
          if (object.parent === sceneRef.current) {
            objectsToRemove.push(object);
          }
        });
        objectsToRemove.forEach((object: any) => {
          if (object instanceof THREE.Mesh) {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
              if (Array.isArray(object.material)) {
                object.material.forEach((mat: any) => mat.dispose());
              } else {
                object.material.dispose();
              }
            }
          }
          sceneRef.current.remove(object);
        });

        // 最后清空场景
        sceneRef.current.clear();
      }

      // 清理渲染器
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current.forceContextLoss();
        if (containerRef.current && rendererRef.current.domElement && containerRef.current.contains(rendererRef.current.domElement)) {
          containerRef.current.removeChild(rendererRef.current.domElement);
        }
        rendererRef.current = null;
      }

      // 清理控制器
      if (controlsRef.current) {
        controlsRef.current.dispose();
        controlsRef.current = null;
      }

      // 清理 Agent 相关的 Map
      agentTargetPositionsRef.current.clear();
      agentIsMovingRef.current.clear();
      agentPhysicsRef.current.clear();
      agentRotationsRef.current.clear();
      communicationChannelsRef.current.forEach((line) => {
        sceneRef.current?.remove(line);
        line.geometry.dispose();
        (line.material as any).dispose();
      });
      communicationChannelsRef.current.clear();

      // 重置状态
      setSceneReady(false);
      setInitAttempted(false);

      // 重置渲染版本追踪
      renderedRoadsRef.current = '';
      renderedBuildingsRef.current = '';

      // 清空场景引用
      sceneRef.current = null;

      console.log('[VirtualSpace3D] Cleanup completed');
    };
  }, [enableTerrain]); // 添加 enableTerrain 依赖

  // 更新 Agent 显示
  useEffect(() => {
    if (!sceneReady || !sceneRef.current) return;

    const group = agentMeshesRef.current;

    // 保存当前选中 Agent 的位置和旋转（保留键盘控制的状态）
    const selectedAgentId = currentSelectedAgentRef.current;
    const savedAgentState = new Map<string, { position: THREE.Vector3; rotation: number }>();

    while (group.children.length > 0) {
      const child = group.children[0];
      if (child.userData.agentId) {
        const agentId = child.userData.agentId;
        // 如果是选中的 Agent，保存其当前状态
        if (agentId === selectedAgentId) {
          savedAgentState.set(agentId, {
            position: child.position.clone(),
            rotation: child.rotation.y
          });
          // 保留旋转角度引用
          if (agentRotationsRef.current.has(agentId)) {
            // 不删除，保留状态
          } else {
            agentRotationsRef.current.delete(agentId);
          }
        } else {
          // 非选中 Agent，清除其相关数据
          agentRotationsRef.current.delete(agentId);
          agentPhysicsRef.current.delete(agentId);
          agentTargetPositionsRef.current.delete(agentId);
        }
      }
      if (child instanceof THREE.Group) {
        child.clear();
      }
      group.remove(child);
    }

    // 添加新的 Agent - 动漫 Q 版风格
    agents.forEach(agent => {
      const agentGroup = new THREE.Group();

      // 如果是选中的 Agent 且有保存的状态，使用保存的位置（键盘控制的位置）
      const savedState = savedAgentState.get(agent.agent_id);
      if (savedState) {
        agentGroup.position.copy(savedState.position);
        agentGroup.rotation.y = savedState.rotation;
        console.log(`[AgentUpdate] Keeping keyboard position for ${agent.agent_id}:`, savedState.position);
      } else {
        // Q 版 Agent 直接放在地面上（y = agent.y）
        agentGroup.position.set(agent.x, agent.y, agent.z);
      }

      const moodColor = moodColors[agent.mood] || '#6b7280';
      const skinColor = 0xffe0c0; // 更嫩的肤色

      // 根据心情设定头发颜色
      const hairColors: Record<string, number> = {
        happy: 0x4a3728,    // 棕色
        sad: 0x6b5b95,      // 紫色
        angry: 0x8b0000,    // 深红
        neutral: 0x2c1810,  // 深棕
        focused: 0x1a1a2e,  // 深蓝黑
        relaxed: 0xdeb887,  // 金色
      };
      const hairColor = hairColors[agent.mood] || 0x2c1810;

      // 眼睛颜色（根据心情变化）
      const eyeColors: Record<string, number> = {
        happy: 0x88ccff,    // 蓝色
        sad: 0x6699cc,      // 灰蓝
        angry: 0xff6644,    // 红色
        neutral: 0x88cc88,  // 绿色
        focused: 0x4488ff,  // 深蓝
        relaxed: 0xffaa66,  // 琥珀色
      };
      const eyeColor = eyeColors[agent.mood] || 0x88cc88;

      // === Q版短腿 ===
      // 左腿（短粗）
      const legGeometry = new THREE.CapsuleGeometry(0.5, 0.8, 4, 8);
      const legMaterial = new THREE.MeshStandardMaterial({ color: 0x444466 });
      const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
      leftLeg.position.set(-0.4, 0.6, 0);  // 降低腿部位置
      leftLeg.castShadow = true;
      agentGroup.add(leftLeg);
      leftLeg.userData = { part: 'leftLeg', initialY: 0.6 };

      // 右腿
      const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
      rightLeg.position.set(0.4, 0.6, 0);  // 降低腿部位置
      rightLeg.castShadow = true;
      agentGroup.add(rightLeg);
      rightLeg.userData = { part: 'rightLeg', initialY: 0.6 };

      // === Q版鞋子（圆润）===
      const shoeGeometry = new THREE.SphereGeometry(0.45, 16, 16);
      shoeGeometry.scale(1.3, 0.7, 1.5);
      const shoeMaterial = new THREE.MeshStandardMaterial({ color: 0x222233 });
      const leftShoe = new THREE.Mesh(shoeGeometry, shoeMaterial);
      leftShoe.position.set(-0.4, 0.15, 0.15);  // 鞋子贴地
      leftShoe.castShadow = true;
      agentGroup.add(leftShoe);
      leftShoe.userData = { part: 'leftShoe', parent: 'leftLeg' };

      const rightShoe = new THREE.Mesh(shoeGeometry, shoeMaterial);
      rightShoe.position.set(0.4, 0.15, 0.15);  // 鞋子贴地
      rightShoe.castShadow = true;
      agentGroup.add(rightShoe);
      rightShoe.userData = { part: 'rightShoe', parent: 'rightLeg' };

      // === Q版身体（圆润小巧）===
      const bodyGeometry = new THREE.SphereGeometry(1.4, 32, 32);
      bodyGeometry.scale(1, 0.85, 0.9);
      const bodyMaterial = new THREE.MeshStandardMaterial({
        color: moodColor,
        metalness: 0.1,
        roughness: 0.6
      });
      const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
      body.position.y = 2.2;
      body.castShadow = true;
      agentGroup.add(body);

      // === Q版手臂（短而圆）===
      // 左臂
      const armGeometry = new THREE.CapsuleGeometry(0.35, 0.6, 4, 8);
      const armMaterial = new THREE.MeshStandardMaterial({ color: moodColor });
      const leftArm = new THREE.Mesh(armGeometry, armMaterial);
      leftArm.position.set(-1.2, 2.3, 0);
      leftArm.rotation.z = Math.PI / 5;
      leftArm.castShadow = true;
      agentGroup.add(leftArm);
      leftArm.userData = { part: 'leftArm', initialRotation: Math.PI / 5 };

      // 左手（圆润的小手）
      const handGeometry = new THREE.SphereGeometry(0.4, 16, 16);
      const handMaterial = new THREE.MeshStandardMaterial({ color: skinColor });
      const leftHand = new THREE.Mesh(handGeometry, handMaterial);
      leftHand.position.set(-1.6, 1.7, 0);
      leftHand.castShadow = true;
      agentGroup.add(leftHand);
      leftHand.userData = { part: 'leftHand', parent: 'leftArm' };

      // 右臂
      const rightArm = new THREE.Mesh(armGeometry, armMaterial);
      rightArm.position.set(1.2, 2.3, 0);
      rightArm.rotation.z = -Math.PI / 5;
      rightArm.castShadow = true;
      agentGroup.add(rightArm);
      rightArm.userData = { part: 'rightArm', initialRotation: -Math.PI / 5 };

      // 右手
      const rightHand = new THREE.Mesh(handGeometry, handMaterial);
      rightHand.position.set(1.6, 1.7, 0);
      rightHand.castShadow = true;
      agentGroup.add(rightHand);
      rightHand.userData = { part: 'rightHand', parent: 'rightArm' };

      // === Q版超大头部 ===
      const headGeometry = new THREE.SphereGeometry(1.3, 32, 32);
      const headMaterial = new THREE.MeshStandardMaterial({
        color: skinColor,
        metalness: 0.0,
        roughness: 0.8
      });
      const head = new THREE.Mesh(headGeometry, headMaterial);
      head.position.y = 4.2;
      head.castShadow = true;
      agentGroup.add(head);
      head.userData = { part: 'head' };

      // === 头发（Q版发型）===
      // 头顶发髻
      const hairTopGeometry = new THREE.SphereGeometry(1.4, 32, 32);
      hairTopGeometry.scale(1, 0.7, 1);
      const hairMaterial = new THREE.MeshStandardMaterial({
        color: hairColor,
        metalness: 0.3,
        roughness: 0.5
      });
      const hairTop = new THREE.Mesh(hairTopGeometry, hairMaterial);
      hairTop.position.y = 4.6;
      hairTop.castShadow = true;
      agentGroup.add(hairTop);

      // 刘海（前额发片）
      const bangsGeometry = new THREE.SphereGeometry(1.35, 32, 32);
      bangsGeometry.scale(1, 0.4, 0.6);
      const bangs = new THREE.Mesh(bangsGeometry, hairMaterial);
      bangs.position.set(0, 4.1, 0.9);
      bangs.castShadow = true;
      agentGroup.add(bangs);

      // 侧面头发
      const sideHairGeometry = new THREE.SphereGeometry(0.5, 16, 16);
      sideHairGeometry.scale(0.6, 1.2, 0.8);
      const leftSideHair = new THREE.Mesh(sideHairGeometry, hairMaterial);
      leftSideHair.position.set(-1.1, 3.8, 0);
      leftSideHair.castShadow = true;
      agentGroup.add(leftSideHair);

      const rightSideHair = new THREE.Mesh(sideHairGeometry, hairMaterial);
      rightSideHair.position.set(1.1, 3.8, 0);
      rightSideHair.castShadow = true;
      agentGroup.add(rightSideHair);

      // === 超大动漫眼睛 ===
      // 眼白（更大的眼睛）
      const eyeWhiteGeometry = new THREE.SphereGeometry(0.45, 32, 32);
      eyeWhiteGeometry.scale(1, 1.3, 0.5);
      const eyeWhiteMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        metalness: 0,
        roughness: 0.3
      });
      const leftEyeWhite = new THREE.Mesh(eyeWhiteGeometry, eyeWhiteMaterial);
      leftEyeWhite.position.set(-0.4, 4.25, 1.0);
      agentGroup.add(leftEyeWhite);

      const rightEyeWhite = new THREE.Mesh(eyeWhiteGeometry, eyeWhiteMaterial);
      rightEyeWhite.position.set(0.4, 4.25, 1.0);
      agentGroup.add(rightEyeWhite);

      // 虹膜（大而明亮）
      const irisGeometry = new THREE.SphereGeometry(0.35, 32, 32);
      irisGeometry.scale(1, 1.2, 0.5);
      const irisMaterial = new THREE.MeshStandardMaterial({
        color: eyeColor,
        metalness: 0.2,
        roughness: 0.1,
        emissive: eyeColor,
        emissiveIntensity: 0.2
      });
      const leftIris = new THREE.Mesh(irisGeometry, irisMaterial);
      leftIris.position.set(-0.4, 4.25, 1.25);
      agentGroup.add(leftIris);
      leftIris.userData = { part: 'leftIris' };

      const rightIris = new THREE.Mesh(irisGeometry, irisMaterial);
      rightIris.position.set(0.4, 4.25, 1.25);
      agentGroup.add(rightIris);
      rightIris.userData = { part: 'rightIris' };

      // 瞳孔
      const pupilGeometry = new THREE.SphereGeometry(0.18, 16, 16);
      pupilGeometry.scale(1, 1.2, 0.6);
      const pupilMaterial = new THREE.MeshStandardMaterial({
        color: 0x000000,
        metalness: 0,
        roughness: 0
      });
      const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
      leftPupil.position.set(-0.4, 4.25, 1.38);
      agentGroup.add(leftPupil);
      leftPupil.userData = { part: 'leftPupil', iris: leftIris };

      const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
      rightPupil.position.set(0.4, 4.25, 1.38);
      agentGroup.add(rightPupil);
      rightPupil.userData = { part: 'rightPupil', iris: rightIris };

      // 高光（动漫眼特色）
      const highlightGeometry = new THREE.SphereGeometry(0.08, 16, 16);
      const highlightMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

      // 主高光（大）
      const mainHighlightGeometry = new THREE.SphereGeometry(0.12, 16, 16);
      const leftMainHighlight = new THREE.Mesh(mainHighlightGeometry, highlightMaterial);
      leftMainHighlight.position.set(-0.28, 4.35, 1.35);
      agentGroup.add(leftMainHighlight);

      const rightMainHighlight = new THREE.Mesh(mainHighlightGeometry, highlightMaterial);
      rightMainHighlight.position.set(0.48, 4.35, 1.35);
      agentGroup.add(rightMainHighlight);

      // 次高光（小）
      const leftSubHighlight = new THREE.Mesh(highlightGeometry, highlightMaterial);
      leftSubHighlight.position.set(-0.45, 4.15, 1.42);
      agentGroup.add(leftSubHighlight);

      const rightSubHighlight = new THREE.Mesh(highlightGeometry, highlightMaterial);
      rightSubHighlight.position.set(0.35, 4.15, 1.42);
      agentGroup.add(rightSubHighlight);

      // === Q版嘴巴（小巧可爱）===
      const mouthGeometry = new THREE.SphereGeometry(0.15, 16, 16);
      mouthGeometry.scale(1, 0.5, 0.5);
      const mouthMaterial = new THREE.MeshStandardMaterial({ color: 0xff8888 });
      const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
      mouth.position.set(0, 3.85, 1.15);
      agentGroup.add(mouth);
      mouth.userData = { part: 'mouth' };

      // === 腮红（可爱效果）===
      const blushGeometry = new THREE.CircleGeometry(0.25, 16);
      const blushMaterial = new THREE.MeshBasicMaterial({
        color: 0xffb6c1,
        transparent: true,
        opacity: 0.5
      });
      const leftBlush = new THREE.Mesh(blushGeometry, blushMaterial);
      leftBlush.position.set(-0.8, 3.95, 1.1);
      leftBlush.rotation.y = -0.3;
      agentGroup.add(leftBlush);

      const rightBlush = new THREE.Mesh(blushGeometry, blushMaterial);
      rightBlush.position.set(0.8, 3.95, 1.1);
      rightBlush.rotation.y = 0.3;
      agentGroup.add(rightBlush);

      // === 名称标签（可点击）===
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = 256;
      canvas.height = 64;

      // 标签背景
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.roundRect(0, 0, 256, 64, 8);
      ctx.fill();

      // 名称
      ctx.font = 'bold 20px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(agent.agent_name, 128, 25);

      // 状态
      const statusIcon = agent.status === 'online' ? '🟢' : '🔴';
      ctx.font = '16px sans-serif';
      ctx.fillText(`${statusIcon} ⚡${agent.energy}%`, 128, 50);

      const texture = new THREE.CanvasTexture(canvas);
      const labelGeometry = new THREE.PlaneGeometry(6, 1.5);
      const labelMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide
      });
      const label = new THREE.Mesh(labelGeometry, labelMaterial);
      label.position.set(0, 6.5, 0); // Q版角色更矮，标签位置调低
      label.userData = {
        isLabel: true,
        agentId: agent.agent_id,
        agentName: agent.agent_name,
        agentPosition: new THREE.Vector3(agent.x, agent.y + 1, agent.z)
      };
      agentGroup.add(label);

      // 添加选中指示环（Selection Ring）- 适配 Q 版更小的尺寸
      const ringGeometry = new THREE.RingGeometry(2, 2.5, 32);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff88,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0
      });
      const selectionRing = new THREE.Mesh(ringGeometry, ringMaterial);
      selectionRing.rotation.x = -Math.PI / 2; // 水平放置
      selectionRing.position.y = 0.1; // 在脚下（Q版角色更矮）
      selectionRing.userData = { isSelectionRing: true };
      agentGroup.add(selectionRing);

      // Agent 数据存储（用于动画和交互）
      agentGroup.userData = {
        agentId: agent.agent_id,
        agentName: agent.agent_name,
        mood: agent.mood,
        energy: agent.energy,
        status: agent.status,
        parts: {
          head,
          leftArm,
          rightArm,
          leftLeg,
          rightLeg,
          leftHand,
          rightHand,
          leftPupil,
          rightPupil,
          leftIris,
          rightIris,
          mouth,
          hairTop,
          bangs,
          leftBlush,
          rightBlush
        },
        // 动画状态
        animationState: {
          isWalking: false,
          isWaving: false,
          walkCycle: 0,
          waveCycle: 0
        }
      };

      // 初始化目标位置和旋转角度
      // 如果是选中的 Agent，使用保存的状态（键盘控制的位置）
      if (savedState) {
        agentTargetPositionsRef.current.set(agent.agent_id, {
          x: savedState.position.x,
          y: savedState.position.y,
          z: savedState.position.z
        });
        agentRotationsRef.current.set(agent.agent_id, savedState.rotation);
      } else {
        agentTargetPositionsRef.current.set(agent.agent_id, { x: agent.x, y: agent.y, z: agent.z });
        agentRotationsRef.current.set(agent.agent_id, agentGroup.rotation.y);
      }
      console.log(`[Agent Created] ${agent.agent_id}, rotation: ${agentGroup.rotation.y}, position: (${agent.x}, ${agent.y}, ${agent.z})`);

      group.add(agentGroup);
    });

  }, [agents, sceneReady]);

  // 更新选中状态的视觉效果
  useEffect(() => {
    if (!agentMeshesRef.current || !sceneReady) return;

    agentMeshesRef.current.children.forEach(agentGroup => {
      if (agentGroup instanceof THREE.Group) {
        const agentId = agentGroup.userData.agentId;
        const isSelected = agentId === currentSelectedAgent;

        // 更新选中环
        agentGroup.children.forEach(child => {
          if (child.userData.isSelectionRing && child instanceof THREE.Mesh) {
            if (isSelected) {
              child.material.opacity = 0.8;
              // 添加旋转动画
              const animateRing = () => {
                if (agentId === currentSelectedAgentId) {
                  child.rotation.z += 0.02;
                  requestAnimationFrame(animateRing);
                }
              };
              animateRing();
            } else {
              child.material.opacity = 0;
            }
          }
        });

        // 更新选中 Agent 的发光效果
        agentGroup.children.forEach(child => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
            if (isSelected) {
              child.material.emissive = new THREE.Color(0x00ff00);
              child.material.emissiveIntensity = 0.2;
            } else {
              child.material.emissive = new THREE.Color(0x000000);
              child.material.emissiveIntensity = 0;
            }
          }
        });
      }
    });
  }, [currentSelectedAgentId, sceneReady]);

  // 轮询更新 Agent 位置 - 已禁用（Agent 不再自动移动）
  useEffect(() => {
    if (!sceneReady) return;

    // 禁用自动位置轮询 - Agent 只由键盘控制
    return;

    const pollPositions = async () => {
      try {
        // 获取虚拟世界中的 Agent 位置
        const response = await fetch(getApiUrl('/api/v1/agents/virtual-positions'));
        if (!response.ok) return;

        const data = await response.json();

        // 更新目标位置 - 但不覆盖当前选中的 Agent（键盘控制）
        const selectedAgent = currentSelectedAgentRef.current;
        data.agents.forEach((agent: any) => {
          // 如果是当前选中的 Agent，不更新位置（由键盘控制）
          if (agent.agent_id !== selectedAgent) {
            agentTargetPositionsRef.current.set(agent.agent_id, {
              x: agent.x,
              y: agent.y,
              z: agent.z
            });
          } else {
            console.log(`[Poll] Skipping selected agent ${agent.agent_id}, keeping keyboard control`);
          }
        });
      } catch (error) {
        console.error('Error polling agent positions:', error);
      }
    };

    // 立即执行一次
    pollPositions();

    // 每 3 秒轮询一次
    const interval = setInterval(pollPositions, 3000);

    return () => clearInterval(interval);
  }, [sceneReady]);

  // 更新建筑显示
  useEffect(() => {
    if (!sceneReady || !sceneRef.current) return;

    // 创建建筑数据的版本标识
    const buildingsVersion = JSON.stringify(buildings.map(b => ({ id: b.id, x: b.x, z: b.z })));

    // 如果建筑数据没有变化，跳过渲染
    if (renderedBuildingsRef.current === buildingsVersion) {
      console.log(`[VirtualSpace3D#${instanceId.current}] Buildings data unchanged, skipping render`);
      return;
    }

    let buildingsGroup = (sceneRef.current as any).buildingsGroup as THREE.Group;

    // 如果 buildingsGroup 不存在，创建它
    if (!buildingsGroup) {
      buildingsGroup = new THREE.Group();
      buildingsGroup.name = 'BuildingsGroup';
      sceneRef.current.add(buildingsGroup);
      (sceneRef.current as any).buildingsGroup = buildingsGroup;
      console.log(`[VirtualSpace3D#${instanceId.current}] Created new buildingsGroup`);
    }

    console.log(`[VirtualSpace3D#${instanceId.current}] Rendering buildings:`, {
      buildingsCount: buildings.length,
      buildingsChildrenBefore: buildingsGroup.children.length,
    });

    // 强制清空现有建筑物（确保从旧的渲染中清理）
    const toRemove: any[] = [];
    buildingsGroup.children.forEach(child => toRemove.push(child));
    toRemove.forEach(child => {
      if (child instanceof THREE.Group) {
        child.traverse((obj: any) => {
          if (obj instanceof THREE.Mesh) {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material instanceof THREE.Material) {
              obj.material.dispose();
            } else if (Array.isArray(obj.material)) {
              obj.material.forEach((mat: any) => mat.dispose());
            }
          }
        });
      }
      buildingsGroup.remove(child);
    });

    console.log('[VirtualSpace3D] Cleared', toRemove.length, 'old building groups');

    // 清空现有建筑物
    while (buildingsGroup.children.length > 0) {
      const child = buildingsGroup.children[0];
      if (child instanceof THREE.Group) {
        // 递归清理Group中的所有mesh
        child.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material instanceof THREE.Material) {
              obj.material.dispose();
            } else if (Array.isArray(obj.material)) {
              obj.material.forEach(mat => mat.dispose());
            }
          }
        });
      }
      buildingsGroup.remove(child);
    }

    // 清空并重建建筑物碰撞数据
    // 注意：建筑物碰撞数据在场景初始化时统一管理，这里只添加新的
    // 先移除旧的建筑物碰撞体
    collidersRef.current = collidersRef.current.filter(c => c.type !== 'building');

    // 添加新建筑
    buildings.forEach(building => {
      // 保存建筑物碰撞边界（用于 Agent 碰撞检测）
      collidersRef.current.push({
        type: 'building',
        x: building.x,
        z: building.z,
        width: building.width,
        depth: building.depth,
        height: building.height,
        passableWithJump: false  // 建筑物不可跳上
      });

      const buildingGroup = new THREE.Group();
      // 建筑物位置：y + height/2 使建筑物底部在 y 上
      buildingGroup.position.set(building.x, building.y + building.height / 2, building.z);

      // 建筑主体
      const geometry = new THREE.BoxGeometry(building.width, building.height, building.depth);
      const material = new THREE.MeshStandardMaterial({ color: building.color });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      buildingGroup.add(mesh);

      // 添加窗户（简单的灰色方块）
      const windowMaterial = new THREE.MeshStandardMaterial({ color: 0x88ccff });
      const floors = Math.floor(building.height / 10);
      const windowsPerFloor = Math.floor(building.width / 8);

      for (let floor = 0; floor < floors; floor++) {
        for (let w = 0; w < windowsPerFloor; w++) {
          const windowGeom = new THREE.BoxGeometry(3, 4, 0.1);
          const windowMesh = new THREE.Mesh(windowGeom, windowMaterial);
          windowMesh.position.set(
            -building.width / 2 + 5 + w * 8,
            -building.height / 2 + 5 + floor * 10,
            building.depth / 2 + 0.05
          );
          buildingGroup.add(windowMesh);
        }
      }

      buildingsGroup.add(buildingGroup);

      // 添加建筑物标签
      if (building.name) {
        // 标签位置在建筑物顶部（building.y + building.height 是建筑物顶部）
        const labelPosition = new THREE.Vector3(building.x, building.y + building.height, building.z);
        const label = createTerrainLabel(building.name, 'building', labelPosition, building.height);
        buildingsGroup.add(label);
      }
    });

    console.log(`[VirtualSpace3D#${instanceId.current}] Buildings rendered:`, {
      buildingsChildrenAfter: buildingsGroup.children.length,
    });

    // 记录已渲染的建筑版本
    renderedBuildingsRef.current = buildingsVersion;

  }, [buildings, sceneReady]);

  // 创建地形特征标签
  const createTerrainLabel = (name: string, featureType: string, position: THREE.Vector3, height?: number): THREE.Mesh => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 256;
    canvas.height = 64;

    // 根据特征类型设置不同颜色
    const typeColors: Record<string, string> = {
      mountain: '#8B4513',
      hill: '#228B22',
      water: '#3B82F6',
      river: '#60A5FA',
      lake: '#3B82F6',
      valley: '#9CA3AF',
      canyon: '#D97706',
      building: '#F59E0B',
      road: '#6B7280',
    };

    const labelColor = typeColors[featureType] || '#6B7280';

    // 标签背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.roundRect(0, 0, 256, 64, 8);
    ctx.fill();

    // 边框
    ctx.strokeStyle = labelColor;
    ctx.lineWidth = 3;
    ctx.roundRect(0, 0, 256, 64, 8);
    ctx.stroke();

    // 名称
    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(name, 128, 28);

    // 类型
    ctx.font = '14px sans-serif';
    ctx.fillStyle = labelColor;
    ctx.fillText(featureType.toUpperCase(), 128, 50);

    const texture = new THREE.CanvasTexture(canvas);
    const labelGeometry = new THREE.PlaneGeometry(8, 2);
    const labelMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide
    });
    const label = new THREE.Mesh(labelGeometry, labelMaterial);

    // 根据特征类型和高度设置标签位置 - 紧贴物体
    let labelHeight;
    if (featureType === 'mountain' || featureType === 'hill') {
      // 山脉和山丘：标签在山顶上方2单位
      labelHeight = height ? height + 2 : 2;
    } else if (featureType === 'building') {
      // 建筑物：标签在屋顶上方1单位
      labelHeight = height ? height + 1 : 1;
    } else if (featureType === 'water' || featureType === 'river' || featureType === 'lake') {
      // 水面和河流：标签在水面上方1单位
      labelHeight = 1;
    } else if (featureType === 'road') {
      // 道路：标签在路面上方1单位
      labelHeight = 1;
    } else {
      // 其他：标签在地面上方1单位
      labelHeight = 1;
    }

    label.position.set(position.x, labelHeight, position.z);
    label.userData = {
      isTerrainLabel: true,
      featureName: name,
      featureType: featureType,
    };

    return label;
  };

  // 渲染地形
  useEffect(() => {
    if (!sceneReady || !sceneRef.current || !enableTerrain) return;

    const terrainGroup = (sceneRef.current as any).terrainGroup as THREE.Group;
    if (!terrainGroup) {
      console.warn('[VirtualSpace3D] No terrainGroup found in scene');
      return;
    }

    console.log(`[VirtualSpace3D] Rendering terrain with ${terrainFeatures.length} features`);

    // 清空现有地形（包括所有子对象）
    while (terrainGroup.children.length > 0) {
      const child = terrainGroup.children[0];
      // 递归清理 Group 中的所有对象
      if (child instanceof THREE.Group) {
        child.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material instanceof THREE.Material) {
              obj.material.dispose();
            } else if (Array.isArray(obj.material)) {
              obj.material.forEach(mat => mat.dispose());
            }
          }
        });
      } else if (child instanceof THREE.Mesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        } else if (Array.isArray(child.material)) {
          child.material.forEach(mat => mat.dispose());
        }
      }
      terrainGroup.remove(child);
    }

    // 清空旧的地形碰撞数据
    collidersRef.current = collidersRef.current.filter(c => !['mountain', 'hill', 'water', 'river'].includes(c.type));

    // 渲染地形特征
    console.log(`[VirtualSpace3D] Starting to render ${terrainFeatures.length} terrain features`);
    terrainFeatures.forEach((feature, index) => {
      console.log(`[VirtualSpace3D] Feature ${index}:`, {
        id: feature.id,
        type: feature.type,
        name: feature.name,
        position: feature.position,
        size: feature.size,
      });

      let mesh: THREE.Object3D | null = null;

      if (feature.type === 'mountain') {
        const metadata = feature.metadata as Record<string, unknown> | undefined;
        const hasSnowCap = metadata?.hasSnowCap as boolean ?? false;
        const snowCapHeight = metadata?.snowCapHeight as number ?? 50;
        const roughness = metadata?.roughness as number ?? 0.7;
        const color = metadata?.color as string | undefined;

        console.log(`[VirtualSpace3D] Creating mountain:`, feature.name, {
          position: feature.position,
          size: feature.size,
          hasSnowCap,
          color,
        });

        mesh = geometryGenerator.createMountain({
          height: feature.size.height,
          baseRadius: feature.size.width / 2,
          segments: 8,
          hasSnowCap,
          snowCapHeight,
          roughness,
        });

        if (color) {
          mesh.traverse((child) => {
            if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
              if (!hasSnowCap || child.position.y < feature.size.height - snowCapHeight) {
                child.material.color.set(color);
              }
            }
          });
        }
      } else if (feature.type === 'hill') {
        const metadata = feature.metadata as Record<string, unknown> | undefined;
        const color = metadata?.color as string | undefined;

        mesh = geometryGenerator.createHill(
          feature.size.height,
          feature.size.width / 2
        );

        if (color && mesh instanceof THREE.Mesh && mesh.material instanceof THREE.MeshStandardMaterial) {
          mesh.material.color.set(color);
        }
      } else if (feature.type === 'water' || feature.type === 'river') {
        const metadata = feature.metadata as Record<string, unknown> | undefined;
        const transparency = metadata?.transparency as number ?? 0.7;
        const color = metadata?.color as string | undefined;

        console.log(`[VirtualSpace3D] Processing ${feature.type}:`, feature.name, {
          hasPath: !!(metadata?.path),
          pathLength: Array.isArray(metadata?.path) ? metadata.path.length : 0,
          width: metadata?.width,
          color: color,
        });

        if (feature.type === 'river') {
          const pathData = metadata?.path as Array<{ x: number; y: number; z: number }> | undefined;
          const width = metadata?.width as number ?? 15;

          console.log(`[VirtualSpace3D] Creating river mesh:`, {
            name: feature.name,
            pathData: pathData?.map(p => `(${p.x}, ${p.y}, ${p.z})`),
            width,
            color,
          });

          if (pathData && pathData.length > 1) {
            // Convert plain objects to THREE.Vector3
            const path = pathData.map(p => new THREE.Vector3(p.x, p.y, p.z));
            const riverGroup = new THREE.Group();
            for (let i = 0; i < path.length - 1; i++) {
              const segment = geometryGenerator.createWater(width, path[i].distanceTo(path[i + 1]) * 2, 16);
              if (color) {
                (segment.material as THREE.MeshStandardMaterial).color.set(color);
              }
              (segment.material as THREE.MeshStandardMaterial).opacity = transparency;

              const midX = (path[i].x + path[i + 1].x) / 2;
              const midZ = (path[i].z + path[i + 1].z) / 2;
              segment.position.set(midX, -0.5, midZ); // 河流嵌入地下
              const angle = Math.atan2(path[i + 1].z - path[i].z, path[i + 1].x - path[i].x);
              segment.rotation.y = angle;
              riverGroup.add(segment);
            }
            mesh = riverGroup;
          }
        }

        if (!mesh) {
          mesh = geometryGenerator.createWater(feature.size.width, feature.size.depth, 32);
          if (mesh instanceof THREE.Mesh) {
            if (color) {
              (mesh.material as THREE.MeshStandardMaterial).color.set(color);
            }
            (mesh.material as THREE.MeshStandardMaterial).opacity = transparency;
          }
        }
      }

      if (mesh) {
        // 设置地形特征的位置
        // 对于河流（riverGroup），内部段已经使用绝对坐标定位，不需要再设置 group 位置
        // 对于其他类型，需要设置位置
        if (feature.type !== 'river' && feature.type !== 'water') {
          // 山和山丘：贴合地面放置（y=0）
          mesh.position.set(feature.position.x, 0, feature.position.z);
        }
        // 河流和水面：riverGroup 内部已经设置了位置和深度（y=-0.5）
        mesh.name = feature.name || `Terrain_${feature.id}`;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        terrainGroup.add(mesh);

        // 添加地形碰撞数据
        if (feature.type === 'mountain' || feature.type === 'hill') {
          collidersRef.current.push({
            type: feature.type,
            x: feature.position.x,
            z: feature.position.z,
            width: feature.size.width,
            depth: feature.size.width,  // 山通常是圆形的，width=depth
            height: feature.size.height,
            passableWithJump: true  // 山和山丘可以跳上去
          });
        } else if (feature.type === 'water' || feature.type === 'river') {
          // 水域碰撞 - 河流需要特殊处理（路径数据）
          const metadata = feature.metadata as Record<string, unknown> | undefined;
          const pathData = metadata?.path as Array<{ x: number; y: number; z: number }> | undefined;
          const width = metadata?.width as number ?? feature.size.width;

          if (feature.type === 'river' && pathData && pathData.length > 1) {
            // 河流：为每段路径添加碰撞体
            for (let i = 0; i < pathData.length - 1; i++) {
              const midX = (pathData[i].x + pathData[i + 1].x) / 2;
              const midZ = (pathData[i].z + pathData[i + 1].z) / 2;
              const segmentLength = Math.sqrt(
                Math.pow(pathData[i + 1].x - pathData[i].x, 2) +
                Math.pow(pathData[i + 1].z - pathData[i].z, 2)
              );

              collidersRef.current.push({
                type: 'river',
                x: midX,
                z: midZ,
                width: width,
                depth: segmentLength,
                passableWithJump: false  // 河流不可通行
              });
            }
          } else {
            // 静止水域
            collidersRef.current.push({
              type: 'water',
              x: feature.position.x,
              z: feature.position.z,
              width: feature.size.width,
              depth: feature.size.depth,
              passableWithJump: false  // 水域不可通行
            });
          }
        }

        console.log(`[VirtualSpace3D] Added terrain mesh:`, feature.name, `at (${feature.position.x}, ${feature.position.y}, ${feature.position.z})`);

        // 添加地形特征名称标签
        if (feature.name) {
          const labelPosition = new THREE.Vector3(feature.position.x, feature.position.y, feature.position.z);
          const featureHeight = feature.size.height || 0;
          const label = createTerrainLabel(feature.name, feature.type, labelPosition, featureHeight);
          terrainGroup.add(label);
          console.log(`[VirtualSpace3D] Added terrain label for: ${feature.name} (${feature.type})`);
        }
      }
    });

    console.log(`[VirtualSpace3D] Terrain rendering complete:`, {
      totalFeatures: terrainFeatures.length,
      addedToGroup: terrainGroup.children.length,
      breakdown: {
        mountains: terrainFeatures.filter(f => f.type === 'mountain').length,
        hills: terrainFeatures.filter(f => f.type === 'hill').length,
        rivers: terrainFeatures.filter(f => f.type === 'river').length,
        waters: terrainFeatures.filter(f => f.type === 'water').length,
      },
    });

  }, [terrainFeatures, sceneReady, enableTerrain]);

  // 渲染道路
  useEffect(() => {
    if (!sceneReady || !sceneRef.current || !enableRoads) return;

    // 创建道路数据的版本标识，用于检测数据是否变化
    const roadsVersion = JSON.stringify(roads.map(r => ({ id: r.id, path: r.path?.length || 0 })));

    // 如果道路数据没有变化，跳过渲染
    if (renderedRoadsRef.current === roadsVersion) {
      console.log(`[VirtualSpace3D#${instanceId.current}] Roads data unchanged, skipping render`);
      return;
    }

    // 获取或创建 roadsGroup
    let roadsGroup = (sceneRef.current as any).roadsGroup as THREE.Group;
    if (!roadsGroup) {
      roadsGroup = new THREE.Group();
      roadsGroup.name = 'RoadsGroup';
      sceneRef.current.add(roadsGroup);
      (sceneRef.current as any).roadsGroup = roadsGroup;
    }

    console.log(`[VirtualSpace3D#${instanceId.current}] Roads useEffect start`, {
      hasRoadsGroup: !!roadsGroup,
      roadsGroupName: roadsGroup?.name,
      existingChildren: roadsGroup.children.length,
      sceneChildren: sceneRef.current?.children.length,
      roadsVersion: roadsVersion.substring(0, 50) + '...',
    });

    console.log('[VirtualSpace3D] Rendering roads:', {
      roadsCount: roads.length,
      intersectionsCount: intersections.length,
      roadsChildrenBefore: roadsGroup.children.length,
    });

    // 强制清空现有道路（确保从旧的渲染中清理）
    const toRemove: any[] = [];
    roadsGroup.children.forEach(child => toRemove.push(child));

    console.log('[VirtualSpace3D] Clearing roads:', {
      before: toRemove.length,
      groupName: roadsGroup.name,
      groupUuid: (roadsGroup as any).uuid,
    });

    toRemove.forEach(child => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        } else if (Array.isArray(child.material)) {
          child.material.forEach((mat: any) => mat.dispose());
        }
      }
      roadsGroup.remove(child);
    });

    // 二次确认：再次清空任何剩余的子元素
    while (roadsGroup.children.length > 0) {
      const child = roadsGroup.children[0];
      roadsGroup.remove(child);
    }

    console.log('[VirtualSpace3D] Cleared', toRemove.length, 'old road meshes, children after clear:', roadsGroup.children.length);

    // 清空材质缓存，确保使用新的道路颜色
    materialFactory.clearCache();

    // 渲染道路
    let segmentsRendered = 0;
    let meshesAdded = 0;
    roads.forEach(road => {
      if (!road.path || road.path.length < 2) {
        console.warn('[VirtualSpace3D] Skipping road with invalid path:', road.name, {
          hasPath: !!road.path,
          pathLength: road.path?.length || 0,
        });
        return;
      }

      // 优先使用 Dashboard 传入的 color，如果没有则使用 getRoadColor
      let roadColor: number;
      if (road.color) {
        // 将十六进制字符串转换为数字颜色 (#RRGGBB -> 0xRRGGBB)
        roadColor = parseInt(road.color.replace('#', ''), 16);
        console.log('[VirtualSpace3D] Using dashboard color for road:', road.name, road.color);
      } else {
        roadColor = getRoadColor(road.type);
      }

      const path = road.path.map(p => new THREE.Vector3(p.x, p.y, p.z));

      console.log('[VirtualSpace3D] Rendering road:', road.name, 'type:', road.type, 'color:', roadColor.toString(16), 'with', path.length, 'points');

      for (let i = 0; i < path.length - 1; i++) {
        const start = path[i];
        const end = path[i + 1];
        const length = start.distanceTo(end);
        const direction = new THREE.Vector3().subVectors(end, start).normalize();
        const angle = Math.atan2(direction.x, direction.z);

        // 道路主体
        const roadGeometry = new THREE.PlaneGeometry(road.width, length);
        const roadMaterial = materialFactory.getMaterial({
          type: 'road',
          color: roadColor,
          flatShading: true,
          roughness: 0.9,
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
        roadsGroup.add(roadMesh);
        meshesAdded++;
        segmentsRendered++;

        // 车道标线
        if (road.lanes > 1 && road.has_lane_markings !== false) {
          addLaneMarkings(roadsGroup, start, end, road.width, road.lanes, angle);
        }

        // 边缘线
        addEdgeMarkings(roadsGroup, start, end, road.width, angle);
      }

      // 添加道路标签（在道路中点，紧贴路面）
      if (road.name && path.length > 0) {
        const midIndex = Math.floor(path.length / 2);
        const midPoint = path[midIndex];
        // 道路在 y = 0.15 的位置，标签紧贴路面
        const labelPosition = new THREE.Vector3(midPoint.x, 0.15, midPoint.z);
        const label = createTerrainLabel(road.name, 'road', labelPosition, 0);
        roadsGroup.add(label);
      }
    });

    // 渲染路口
    let intersectionMeshes = 0;
    intersections.forEach(intersection => {
      const junctionSize = 20;
      const junctionGeometry = new THREE.CircleGeometry(junctionSize, 32);
      const junctionMaterial = materialFactory.getMaterial({
        type: 'road',
        color: CARTOON_COLORS.road,
        flatShading: true,
      });

      const junction = new THREE.Mesh(junctionGeometry, junctionMaterial);
      junction.rotation.x = -Math.PI / 2;
      junction.position.set(intersection.position.x, 0.15, intersection.position.z);
      roadsGroup.add(junction);

      // 交通信号灯
      if (intersection.isTrafficControlled) {
        const poleGeometry = new THREE.CylinderGeometry(0.2, 0.2, 4, 8);
        const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const pole = new THREE.Mesh(poleGeometry, poleMaterial);
        pole.position.set(intersection.position.x + 8, 2, intersection.position.z + 8);
        roadsGroup.add(pole);

        const boxGeometry = new THREE.BoxGeometry(1.5, 0.8, 0.5);
        const boxMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
        const box = new THREE.Mesh(boxGeometry, boxMaterial);
        box.position.set(intersection.position.x + 8, 4, intersection.position.z + 8);
        roadsGroup.add(box);

        const lightGeometry = new THREE.CircleGeometry(0.2, 16);
        const lightMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const light = new THREE.Mesh(lightGeometry, lightMaterial);
        light.position.set(intersection.position.x + 8, 4.1, intersection.position.z + 7.7);
        roadsGroup.add(light);
        intersectionMeshes += 4; // junction + pole + box + light
      }
    });

    console.log(`[VirtualSpace3D#${instanceId.current}] Roads rendered:`, {
      roadSegments: segmentsRendered,
      meshesAdded: meshesAdded,
      intersectionMeshes,
      roadsChildrenBeforeClear: toRemove.length,
      roadsChildrenAfter: roadsGroup.children.length,
      expected: meshesAdded + intersectionMeshes,
    });

    // 记录已渲染的道路版本
    renderedRoadsRef.current = roadsVersion;

  }, [roads, intersections, sceneReady, enableRoads]);

  // 渲染车辆
  useEffect(() => {
    if (!sceneReady || !sceneRef.current || !enableVehicles) return;

    const vehiclesGroup = (sceneRef.current as any).vehiclesGroup as THREE.Group;
    if (!vehiclesGroup) return;

    // 清空现有车辆
    while (vehiclesGroup.children.length > 0) {
      const child = vehiclesGroup.children[0];
      if (child instanceof THREE.Mesh || child instanceof THREE.Group) {
        child.traverse((mesh) => {
          if (mesh instanceof THREE.Mesh) {
            mesh.geometry.dispose();
            if (mesh.material instanceof THREE.Material) {
              mesh.material.dispose();
            }
          }
        });
      }
      vehiclesGroup.remove(child);
    }

    // 清空旧的车辆碰撞数据
    collidersRef.current = collidersRef.current.filter(c => c.type !== 'vehicle');

    // 渲染车辆
    vehicles.forEach(vehicle => {
      const vehicleMesh = createVehicleMesh(vehicle);
      if (vehicleMesh) {
        vehiclesGroup.add(vehicleMesh);

        // 添加车辆碰撞数据
        // 车辆尺寸估计
        const vehicleWidth = vehicle.type === 'car' ? 4 : vehicle.type === 'bus' ? 6 : 3;
        const vehicleDepth = vehicle.type === 'car' ? 8 : vehicle.type === 'bus' ? 12 : 6;

        collidersRef.current.push({
          type: 'vehicle',
          x: vehicle.position.x,
          z: vehicle.position.z,
          width: vehicleWidth,
          depth: vehicleDepth,
          passableWithJump: false  // 车辆不可跳上
        });
      }
    });

  }, [vehicles, sceneReady, enableVehicles, onVehicleClick]);

  // 渲染河流
  useEffect(() => {
    if (!sceneReady || !sceneRef.current) return;
    if (!rivers || rivers.length === 0) return;

    const riversGroup = (sceneRef.current as any).riversGroup as THREE.Group;
    if (!riversGroup) return;

    // 清空现有河流
    while (riversGroup.children.length > 0) {
      const child = riversGroup.children[0];
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
      riversGroup.remove(child);
    }

    // 渲染河流
    rivers.forEach(river => {
      if (!river.path || river.path.length < 2) return;

      const path = river.path.map(p => new THREE.Vector3(p.x, p.y, p.z));

      for (let i = 0; i < path.length - 1; i++) {
        const start = path[i];
        const end = path[i + 1];
        const length = start.distanceTo(end);
        const direction = new THREE.Vector3().subVectors(end, start).normalize();
        const angle = Math.atan2(direction.x, direction.z);

        // 创建河流段
        const riverGeometry = new THREE.PlaneGeometry(river.width, length);
        const riverMaterial = new THREE.MeshStandardMaterial({
          color: 0x3b82f6,
          roughness: 0.1,
          metalness: 0.3,
          transparent: true,
          opacity: 0.8,
        });

        const riverMesh = new THREE.Mesh(riverGeometry, riverMaterial);
        riverMesh.rotation.x = -Math.PI / 2;
        riverMesh.rotation.z = angle;
        riverMesh.position.set(
          (start.x + end.x) / 2,
          -0.1,  // 略低于地面
          (start.z + end.z) / 2
        );
        riverMesh.receiveShadow = true;
        riversGroup.add(riverMesh);

        // 添加河岸
        const bankHeight = 0.5;
        const bankWidth = 2;
        const bankGeometry = new THREE.BoxGeometry(bankWidth, bankHeight, length);
        const bankMaterial = new THREE.MeshStandardMaterial({
          color: 0x8b7355,
          roughness: 0.9,
        });

        // 左岸
        const leftBank = new THREE.Mesh(bankGeometry, bankMaterial);
        leftBank.rotation.x = -Math.PI / 2;
        leftBank.rotation.z = angle;
        leftBank.position.set(
          (start.x + end.x) / 2 - (river.width / 2 + bankWidth / 2) * Math.cos(angle),
          bankHeight / 2 - 0.1,
          (start.z + end.z) / 2 - (river.width / 2 + bankWidth / 2) * Math.sin(angle)
        );
        riversGroup.add(leftBank);

        // 右岸
        const rightBank = new THREE.Mesh(bankGeometry.clone(), bankMaterial.clone());
        rightBank.position.set(
          (start.x + end.x) / 2 + (river.width / 2 + bankWidth / 2) * Math.cos(angle),
          bankHeight / 2 - 0.1,
          (start.z + end.z) / 2 + (river.width / 2 + bankWidth / 2) * Math.sin(angle)
        );
        riversGroup.add(rightBank);
      }
    });

    // 为每条河流添加标签
    rivers.forEach(river => {
      if (!river.name || !river.path || river.path.length < 2) return;

      // 计算河流中心点位置
      const midIndex = Math.floor(river.path.length / 2);
      const midPoint = river.path[midIndex];
      // 河流在 y = -0.1 的位置，标签紧贴水面
      const labelPosition = new THREE.Vector3(midPoint.x, -0.1, midPoint.z);

      const label = createTerrainLabel(river.name, 'river', labelPosition, 0);
      riversGroup.add(label);
      console.log(`[VirtualSpace3D] Added river label for: ${river.name}`);
    });

    console.log(`[VirtualSpace3D] Rendered ${rivers.length} rivers with labels`);
  }, [rivers, sceneReady]);

  // 聚焦到指定的 Agent（需要在 useEffect 之前定义）
  const focusOnAgent = (agentId: string) => {
    if (!agentMeshesRef.current || !cameraRef.current || !controlsRef.current) return;

    const agent = agentMeshesRef.current.children.find(
      (child: any) => child.userData?.agentId === agentId
    ) as THREE.Group | undefined;

    if (!agent) return;

    const targetPos = agent.position.clone();
    targetPos.y += 5;

    const startPos = cameraRef.current.position.clone();
    const startTarget = controlsRef.current.target.clone();
    const duration = 1000;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      const offset = startPos.clone().sub(startTarget);
      const newCameraPos = targetPos.clone().add(offset);
      cameraRef.current!.position.lerpVectors(startPos, newCameraPos, easeProgress);
      controlsRef.current!.target.lerpVectors(startTarget, targetPos, easeProgress);
      controlsRef.current!.update();

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  };

  // 更新 Agent 交流通道
  const updateCommunicationChannels = () => {
    if (!sceneRef.current || !agentMeshesRef.current) return;

    const scene = sceneRef.current as any;

    // 如果交流通道组不存在，创建它
    if (!(scene as any).channelsGroup) {
      const group = new THREE.Group();
      group.name = 'communication_channels';
      (scene as any).channelsGroup = group;
      scene.add(group);
    }

    const channelsGroup = (scene as any).channelsGroup as THREE.Group;

    // 获取所有 Agent 的位置
    const agents: Array<{ id: string; position: THREE.Vector3 }> = [];
    agentMeshesRef.current.children.forEach((agentGroup) => {
      const group = agentGroup as THREE.Group;
      if (group.userData.agentId) {
        agents.push({
          id: group.userData.agentId,
          position: group.position.clone(),
        });
      }
    });

    // 检测所有 Agent 对之间的距离
    const activeChannels = new Set<string>();
    const materials = [
      new THREE.LineBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.6 }),
      new THREE.LineBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.6 }),
      new THREE.LineBasicMaterial({ color: 0xff6b6b, transparent: true, opacity: 0.6 }),
      new THREE.LineBasicMaterial({ color: 0xa78bfa, transparent: true, opacity: 0.6 }),
    ];

    for (let i = 0; i < agents.length; i++) {
      for (let j = i + 1; j < agents.length; j++) {
        const agent1 = agents[i];
        const agent2 = agents[j];
        const distance = agent1.position.distanceTo(agent2.position);

        // 如果距离 < 10 米，创建交流通道
        if (distance < COMMUNICATION_RANGE) {
          const channelId = `${agent1.id}-${agent2.id}`;
          const channelKey = `${agent1.id}-${agent2.id}`;
          activeChannels.add(channelKey);

          // 如果通道不存在，创建它
          if (!communicationChannelsRef.current.has(channelKey)) {
            const points = [agent1.position, agent2.position];
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = materials[Math.floor(Math.random() * materials.length)];
            const line = new THREE.Line(geometry, material);
            line.name = `channel_${channelId}`;
            channelsGroup.add(line);
            communicationChannelsRef.current.set(channelKey, line);

            console.log(`[Communication] ${agent1.id} <-> ${agent2.id}: ${distance.toFixed(1)}m`);
          }
        }
      }
    }

    // 移除不再活跃的通道
    communicationChannelsRef.current.forEach((line, key) => {
      if (!activeChannels.has(key)) {
        channelsGroup.remove(line);
        line.geometry.dispose();
        (line.material as THREE.Material).dispose();
        communicationChannelsRef.current.delete(key);
      }
    });
  };

  // 视角模式更新函数
  const updateCameraForViewMode = () => {
    if (!cameraRef.current || !controlsRef.current || !agentMeshesRef.current) return;

    // Validate camera is still a valid THREE.Camera instance
    if (!cameraRef.current.isCamera) {
      console.error('Camera is not a valid THREE.Camera instance');
      return;
    }

    // 使用 ref 获取最新的视角模式，避免闭包陷阱
    const mode = viewModeRef.current;
    // 优先使用外部传入的 currentSelectedAgentId，其次使用内部状态的 ref
    const trackedId = trackedAgentRef.current || currentSelectedAgentId || currentSelectedAgentRef.current;

    // If no tracked agent for first/second person mode, fall back to third-person behavior
    if (!trackedId && mode !== 'third-person') {
      controlsRef.current.enableRotate = true;
      controlsRef.current.minDistance = 15;
      controlsRef.current.maxDistance = 150;
      return;
    }

    const trackedAgent = agentMeshesRef.current.children.find(
      (child: any) => child.userData?.agentId === trackedId
    ) as THREE.Group | undefined;

    // If tracked agent not found for first/second person mode, fall back to third-person behavior
    if (!trackedAgent && mode !== 'third-person') {
      controlsRef.current.enableRotate = true;
      controlsRef.current.minDistance = 15;
      controlsRef.current.maxDistance = 150;
      return;
    }

    const agentPos = trackedAgent?.position || new THREE.Vector3(0, 0, 0);
    const agentRotation = trackedAgent?.rotation?.y || 0;

    switch (mode) {
      case 'first-person':
        cameraRef.current.position.copy(agentPos);
        cameraRef.current.position.y += 5.5;
        controlsRef.current.target.set(
          agentPos.x + Math.sin(agentRotation) * 10,
          agentPos.y + 5.5,
          agentPos.z + Math.cos(agentRotation) * 10
        );
        controlsRef.current.enableRotate = false;
        break;

      case 'second-person':
        const cameraOffset = new THREE.Vector3(
          Math.sin(agentRotation) * -8,
          8,
          Math.cos(agentRotation) * -8
        );
        cameraRef.current.position.copy(agentPos).add(cameraOffset);
        controlsRef.current.target.copy(agentPos);
        controlsRef.current.enableRotate = true;
        controlsRef.current.minDistance = 5;
        controlsRef.current.maxDistance = 20;
        break;

      case 'third-person':
      default:
        controlsRef.current.enableRotate = true;
        controlsRef.current.minDistance = 15;
        controlsRef.current.maxDistance = 150;
        // 第三人称模式：相机跟随选中的 Agent
        if (trackedAgent) {
          // 平滑移动相机 target 到 Agent 位置
          const currentTarget = controlsRef.current.target;
          const targetLerpFactor = 0.05;
          const newTargetX = currentTarget.x + (agentPos.x - currentTarget.x) * targetLerpFactor;
          const newTargetY = currentTarget.y + ((agentPos.y + 2) - currentTarget.y) * targetLerpFactor;
          const newTargetZ = currentTarget.z + (agentPos.z - currentTarget.z) * targetLerpFactor;
          currentTarget.set(newTargetX, newTargetY, newTargetZ);

          // 相机位置也跟随，但保持相对距离
          const currentCameraPos = cameraRef.current.position;
          const relativeOffset = new THREE.Vector3(
            currentCameraPos.x - currentTarget.x,
            currentCameraPos.y - currentTarget.y,
            currentCameraPos.z - currentTarget.z
          );
          // 限制最大偏移距离，保持相机在一定范围内
          const maxDistance = 50;
          if (relativeOffset.length() > maxDistance) {
            relativeOffset.normalize().multiplyScalar(maxDistance);
            cameraRef.current.position.set(
              currentTarget.x + relativeOffset.x,
              currentTarget.y + relativeOffset.y,
              currentTarget.z + relativeOffset.z
            );
          }

          // 调试日志
          if (Math.random() < 0.01) { // 偶尔打印
            console.log(`[Camera] Tracking agent ${trackedId}: agentPos=(${agentPos.x.toFixed(1)}, ${agentPos.z.toFixed(1)}), target=(${newTargetX.toFixed(1)}, ${newTargetZ.toFixed(1)})`);
          }
        }
        break;
    }
  };

  // 当外部传入的 currentSelectedAgentId 改变时，更新追踪
  useEffect(() => {
    if (currentSelectedAgentId) {
      trackedAgentRef.current = currentSelectedAgentId;
      focusOnAgent(currentSelectedAgentId);
    } else {
      trackedAgentRef.current = null;
    }
  }, [currentSelectedAgentId]);

  // 当内部 currentSelectedAgent 状态改变时，也更新追踪
  useEffect(() => {
    if (internalSelectedAgent) {
      trackedAgentRef.current = internalSelectedAgent;
      focusOnAgent(internalSelectedAgent);
    } else {
      // 只有当外部也没有传入 currentSelectedAgentId 时才清空追踪
      if (!currentSelectedAgentId) {
        trackedAgentRef.current = null;
      }
    }
  }, [internalSelectedAgent, currentSelectedAgentId]);

  // 当视角模式改变时通知父组件
  useEffect(() => {
    if (onViewModeChange) {
      onViewModeChange(currentViewMode);
    }
  }, [currentViewMode]);

  // 动画循环
  useEffect(() => {
    if (!sceneReady || !rendererRef.current || !cameraRef.current) return;

    let animationId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();

      if (controlsRef.current) {
        controlsRef.current.update();
      }

      // Agent动画和平滑移动
      if (agentMeshesRef.current) {
        // 调试：每秒打印一次当前选中状态
        if (Math.floor(time) % 2 === 0 && Math.floor(time) !== Math.floor(time - 1/60)) {
          console.log(`[Animate] Current selected agent: ${currentSelectedAgentRef.current}, Total agents: ${agentMeshesRef.current.children.length}`);
        }

        agentMeshesRef.current.children.forEach(agentGroup => {
          if (agentGroup instanceof THREE.Group && agentGroup.userData.parts) {
            const parts = agentGroup.userData.parts;
            const agentId = agentGroup.userData.agentId;
            const isSelected = agentId === currentSelectedAgentRef.current;

            // 初始化物理状态
            if (agentId && !agentPhysicsRef.current.has(agentId)) {
              agentPhysicsRef.current.set(agentId, {
                velocityY: 0,
                isJumping: false,
                groundY: agentGroup.position.y,
              });
            }

            // 键盘控制的移动速度和转向速度
            const moveSpeed = 0.5;
            const turnSpeed = 0.05;

            // 初始化 Agent 的旋转角度
            if (!agentRotationsRef.current.has(agentId)) {
              agentRotationsRef.current.set(agentId, agentGroup.rotation.y);
            }
            const currentRotation = agentRotationsRef.current.get(agentId)!;

            // 如果是选中的 Agent，响应键盘输入
            if (isSelected) {
              let newRotation = currentRotation;
              let keyboardMoveX = 0;
              let keyboardMoveZ = 0;

              // 左右键控制转向
              if (keysPressedRef.current.has('ArrowLeft')) {
                newRotation += turnSpeed;
              }
              if (keysPressedRef.current.has('ArrowRight')) {
                newRotation -= turnSpeed;
              }

              // 上下键沿当前朝向移动
              if (keysPressedRef.current.has('ArrowUp')) {
                // 前进：沿当前朝向移动
                keyboardMoveX = Math.sin(newRotation) * moveSpeed;
                keyboardMoveZ = Math.cos(newRotation) * moveSpeed;
              }
              if (keysPressedRef.current.has('ArrowDown')) {
                // 后退：沿相反方向移动
                keyboardMoveX = -Math.sin(newRotation) * moveSpeed;
                keyboardMoveZ = -Math.cos(newRotation) * moveSpeed;
              }

              // 调试日志
              if (keyboardMoveX !== 0 || keyboardMoveZ !== 0 || newRotation !== currentRotation) {
                console.log(`[Animate] Agent ${agentId}: rotation=${newRotation.toFixed(2)}, move=(${keyboardMoveX.toFixed(2)}, ${keyboardMoveZ.toFixed(2)})`);
              }

              // 更新旋转角度
              agentRotationsRef.current.set(agentId, newRotation);

              // 应用旋转到角色模型
              agentGroup.rotation.y = newRotation;

              // 直接应用移动（不通过目标位置插值）
              if (keyboardMoveX !== 0 || keyboardMoveZ !== 0) {
                const currentPos = agentGroup.position;
                const newX = currentPos.x + keyboardMoveX;
                const newZ = currentPos.z + keyboardMoveZ;

                // 碰撞检测
                const collisionRadius = 3.5;
                let hasCollision = false;

                // 1. Agent 之间的碰撞检测
                if (agentMeshesRef.current) {
                  for (const otherAgent of agentMeshesRef.current.children) {
                    if (otherAgent instanceof THREE.Group && otherAgent.userData.agentId !== agentId) {
                      const otherPos = otherAgent.position;
                      const distToOther = Math.sqrt(
                        Math.pow(newX - otherPos.x, 2) +
                        Math.pow(newZ - otherPos.z, 2)
                      );

                      if (distToOther < collisionRadius) {
                        hasCollision = true;
                        console.log(`[Collision] Agent ${agentId} collided with another agent`);
                        break;
                      }
                    }
                  }
                }

                // 2. Agent 与环境物体之间的碰撞检测（建筑物、地形、车辆等）
                if (!hasCollision) {
                  const agentRadius = 1.5; // Agent 的碰撞半径
                  const physics = agentPhysicsRef.current.get(agentId);
                  const agentHeight = physics ? currentPos.y - physics.groundY : 0; // Agent 当前离地高度

                  for (const collider of collidersRef.current) {
                    // 检测 Agent 是否与物体的 AABB（轴对齐包围盒）碰撞
                    // 物体边界：x ± width/2, z ± depth/2
                    const colliderMinX = collider.x - collider.width / 2 - agentRadius;
                    const colliderMaxX = collider.x + collider.width / 2 + agentRadius;
                    const colliderMinZ = collider.z - collider.depth / 2 - agentRadius;
                    const colliderMaxZ = collider.z + collider.depth / 2 + agentRadius;

                    if (newX >= colliderMinX && newX <= colliderMaxX &&
                        newZ >= colliderMinZ && newZ <= colliderMaxZ) {
                      // 检查是否可以跳上这个物体
                      if (collider.passableWithJump && collider.height) {
                        // 如果 Agent 跳得够高（超过物体高度的一半），可以跳上去
                        const JUMP_THRESHOLD = collider.height * 0.5; // 需要跳到物体高度的一半
                        if (agentHeight > JUMP_THRESHOLD) {
                          // 可以跳上，不阻挡
                          console.log(`[Collision] Agent ${agentId} jumping onto ${collider.type} (height: ${agentHeight.toFixed(1)} > ${JUMP_THRESHOLD.toFixed(1)})`);
                          continue;
                        }
                      }

                      // 阻挡移动
                      hasCollision = true;
                      console.log(`[Collision] Agent ${agentId} blocked by ${collider.type} at (${collider.x}, ${collider.z})`);
                      break;
                    }
                  }
                }

                // 只有在没有碰撞时才更新位置
                if (!hasCollision) {
                  agentGroup.position.x = newX;
                  agentGroup.position.z = newZ;
                  // 同步更新目标位置，保持一致
                  agentTargetPositionsRef.current.set(agentId, {
                    x: newX,
                    y: currentPos.y,
                    z: newZ
                  });
                }
              }
            }

            // 平滑移动非选中 Agent 到目标位置（带碰撞检测）
            let isMoving = false;

            if (!isSelected && agentId && agentTargetPositionsRef.current.has(agentId)) {
              const targetPos = agentTargetPositionsRef.current.get(agentId)!;
              const currentPos = agentGroup.position;
              const lerpFactor = 0.02;

              // 计算到目标的距离
              const dx = targetPos.x - currentPos.x;
              const dz = targetPos.z - currentPos.z;
              const distance = Math.sqrt(dx * dx + dz * dz);

              // 判断是否正在移动
              isMoving = distance > 0.5;
              agentIsMovingRef.current.set(agentId, isMoving);

              // 计算预测的新位置
              const newX = currentPos.x + dx * lerpFactor;
              const newZ = currentPos.z + dz * lerpFactor;

              // 碰撞检测
              const collisionRadius = 3.5;
              let hasCollision = false;

              // 1. Agent 之间的碰撞检测
              if (agentMeshesRef.current) {
                for (const otherAgent of agentMeshesRef.current.children) {
                  if (otherAgent instanceof THREE.Group && otherAgent.userData.agentId !== agentId) {
                    const otherPos = otherAgent.position;
                    const distToOther = Math.sqrt(
                      Math.pow(newX - otherPos.x, 2) +
                      Math.pow(newZ - otherPos.z, 2)
                    );

                    if (distToOther < collisionRadius) {
                      hasCollision = true;
                      // 停止移动这个 Agent
                      agentTargetPositionsRef.current.set(agentId, {
                        x: currentPos.x,
                        y: currentPos.y,
                        z: currentPos.z
                      });
                      break;
                    }
                  }
                }
              }

              // 2. Agent 与环境物体之间的碰撞检测（建筑物、地形、车辆等）
              if (!hasCollision) {
                const agentRadius = 1.5; // Agent 的碰撞半径
                const physics = agentPhysicsRef.current.get(agentId);
                const agentHeight = physics ? currentPos.y - physics.groundY : 0;

                for (const collider of collidersRef.current) {
                  // 检测 Agent 是否与物体的 AABB（轴对齐包围盒）碰撞
                  const colliderMinX = collider.x - collider.width / 2 - agentRadius;
                  const colliderMaxX = collider.x + collider.width / 2 + agentRadius;
                  const colliderMinZ = collider.z - collider.depth / 2 - agentRadius;
                  const colliderMaxZ = collider.z + collider.depth / 2 + agentRadius;

                  if (newX >= colliderMinX && newX <= colliderMaxX &&
                      newZ >= colliderMinZ && newZ <= colliderMaxZ) {
                    // 检查是否可以跳上这个物体
                    if (collider.passableWithJump && collider.height) {
                      const JUMP_THRESHOLD = collider.height * 0.5;
                      if (agentHeight > JUMP_THRESHOLD) {
                        continue; // 可以跳上
                      }
                    }

                    // 阻挡移动
                    hasCollision = true;
                    // 停止移动这个 Agent
                    agentTargetPositionsRef.current.set(agentId, {
                      x: currentPos.x,
                      y: currentPos.y,
                      z: currentPos.z
                    });
                    break;
                  }
                }
              }

              // 只有在没有碰撞时才更新位置
              if (!hasCollision) {
                agentGroup.position.x = newX;
                agentGroup.position.z = newZ;
              }
            } else if (isSelected) {
              // 选中的 Agent：检查是否在移动（用于动画）
              const keysMoving = keysPressedRef.current.has('ArrowUp') || keysPressedRef.current.has('ArrowDown');
              isMoving = keysMoving;
              agentIsMovingRef.current.set(agentId, isMoving);
            }

            // 跳跃物理模拟
            if (agentId && agentPhysicsRef.current.has(agentId)) {
              const physics = agentPhysicsRef.current.get(agentId)!;
              const gravity = -0.6;
              const deltaTime = 1/60; // 约60fps

              if (physics.isJumping) {
                // 应用重力
                physics.velocityY += gravity;
                agentGroup.position.y += physics.velocityY * deltaTime;

                // 检查是否落地
                if (agentGroup.position.y <= physics.groundY) {
                  agentGroup.position.y = physics.groundY;
                  physics.velocityY = 0;
                  physics.isJumping = false;
                  agentPhysicsRef.current.set(agentId, physics);
                } else {
                  // 更新物理状态
                  agentPhysicsRef.current.set(agentId, physics);
                }
              } else {
                // 确保在地面
                if (agentGroup.position.y > physics.groundY) {
                  agentGroup.position.y = physics.groundY;
                }
              }
            }

            // 行走动画 - 只有在移动时才播放
            if (isMoving) {
              // 大幅度的腿部摆动（行走）
              const walkCycle = Math.sin(time * 10); // 更快的行走频率
              const legSwingAngle = Math.PI / 4; // 45度摆动

              if (parts.leftLeg) {
                parts.leftLeg.rotation.x = walkCycle * legSwingAngle;
              }
              if (parts.rightLeg) {
                parts.rightLeg.rotation.x = -walkCycle * legSwingAngle;
              }

              // 手臂大幅度摆动（与腿相反）
              if (parts.leftArm) {
                parts.leftArm.rotation.x = -walkCycle * legSwingAngle * 0.8;
                parts.leftArm.rotation.z = Math.PI / 5;
              }
              if (parts.rightArm) {
                parts.rightArm.rotation.x = walkCycle * legSwingAngle * 0.8;
                parts.rightArm.rotation.z = -Math.PI / 5;
              }

              // 身体轻微上下起伏（行走时）
              if (parts.head) {
                parts.head.position.y = 4.2 + Math.abs(Math.sin(time * 10)) * 0.15;
              }
            } else {
              // 静止或跳跃时的动画
              const physics = agentPhysicsRef.current.get(agentId);
              const isJumping = physics?.isJumping || false;

              if (isJumping) {
                // 跳跃姿态 - 腿部蜷缩
                const jumpTuck = 0.3;
                if (parts.leftLeg) {
                  parts.leftLeg.rotation.x = jumpTuck;
                }
                if (parts.rightLeg) {
                  parts.rightLeg.rotation.x = jumpTuck;
                }

                // 手臂向上举起
                if (parts.leftArm) {
                  parts.leftArm.rotation.x = -Math.PI / 2;
                  parts.leftArm.rotation.z = Math.PI / 8;
                }
                if (parts.rightArm) {
                  parts.rightArm.rotation.x = -Math.PI / 2;
                  parts.rightArm.rotation.z = -Math.PI / 8;
                }

                // 头部略微上仰
                if (parts.head) {
                  parts.head.rotation.x = -0.2;
                  parts.head.position.y = 4.2;
                }
              } else {
                // 静止时的动画
                // 呼吸动画（头部轻微上下浮动）
                if (parts.head) {
                  parts.head.position.y = 4.2 + Math.sin(time * 2) * 0.03;
                  parts.head.rotation.x = 0;
                }

                // 腿部回归静止
                if (parts.leftLeg) {
                  parts.leftLeg.rotation.x = 0;
                }
                if (parts.rightLeg) {
                  parts.rightLeg.rotation.x = 0;
                }

                // 手臂轻微摆动
                const armSwing = Math.sin(time * 2) * 0.05;
                if (parts.leftArm) {
                  parts.leftArm.rotation.x = armSwing;
                  parts.leftArm.rotation.z = Math.PI / 6 + Math.sin(time * 1.5) * 0.1;
                }
                if (parts.rightArm) {
                  parts.rightArm.rotation.x = -armSwing;
                  parts.rightArm.rotation.z = -Math.PI / 6 - Math.sin(time * 1.5) * 0.1;
                }
              }
            }

            // 眼睛眨动（始终进行）
            if (parts.leftPupil && parts.rightPupil) {
              const blinkCycle = (time * 0.3) % 1;
              if (blinkCycle < 0.1) {
                parts.leftPupil.scale.y = 0.1;
                parts.rightPupil.scale.y = 0.1;
              } else {
                parts.leftPupil.scale.y = 1;
                parts.rightPupil.scale.y = 1;
              }
            }

            // 嘴巴动画（微笑）
            if (parts.mouth) {
              parts.mouth.scale.x = 1 + Math.sin(time * 1.5) * 0.1;
            }
          }
        });
      }

      // 检测 Agent 交流通道（距离 < 10 米）
      updateCommunicationChannels();

      // 更新相机视角
      updateCameraForViewMode();

      // 让所有标签始终面向相机（billboard效果）
      if (agentMeshesRef.current && cameraRef.current && cameraRef.current.isCamera) {
        agentMeshesRef.current.children.forEach(agentGroup => {
          if (agentGroup instanceof THREE.Group) {
            agentGroup.children.forEach(child => {
              if (child.userData.isLabel && child instanceof THREE.Mesh) {
                child.lookAt(cameraRef.current!.position);
              }
            });
          }
        });
      }

      // 验证所有引用和相机有效性后再渲染
      if (
        rendererRef.current &&
        sceneRef.current &&
        cameraRef.current &&
        cameraRef.current.isCamera === true
      ) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [sceneReady]);

  // 处理窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      if (cameraRef.current && rendererRef.current && containerRef.current) {
        const width = containerRef.current.offsetWidth;
        const height = containerRef.current.offsetHeight;
        cameraRef.current.aspect = width / height;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(width, height);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 全屏模式下监听 ESC 键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && externalIsFullscreen && onFullscreenChange) {
        onFullscreenChange(false);
      }
    };

    if (externalIsFullscreen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [externalIsFullscreen, onFullscreenChange]);

  // 全屏模式下触发 resize
  useEffect(() => {
    if (externalIsFullscreen && containerRef.current) {
      // 延迟触发 resize 以确保 DOM 已更新
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 100);
    }
  }, [externalIsFullscreen]);

  // 处理点击事件和相机定位
  useEffect(() => {
    if (!sceneReady || !rendererRef.current) return;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // 相机平滑移动到目标位置
    const animateCameraToTarget = (targetPosition: THREE.Vector3) => {
      if (isAnimatingRef.current || !cameraRef.current || !controlsRef.current) return;

      isAnimatingRef.current = true;
      const startPosition = cameraRef.current.position.clone();
      const startTarget = controlsRef.current.target.clone();
      const endTarget = targetPosition.clone();
      endTarget.y += 2; // 稍微抬高视角

      const duration = 1000; // 1秒动画
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // 平滑缓动函数
        const easeProgress = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        // 计算新的相机位置（保持当前的距离和角度）
        const offset = startPosition.clone().sub(startTarget);
        const currentOffset = offset.clone().multiplyScalar(1 - easeProgress);
        const newCameraPos = endTarget.clone().add(currentOffset);

        // 计算新的控制目标
        const newTarget = startTarget.clone().lerp(endTarget, easeProgress);

        cameraRef.current!.position.copy(newCameraPos);
        controlsRef.current!.target.copy(newTarget);
        controlsRef.current!.update();

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          isAnimatingRef.current = false;
        }
      };

      animate();
    };

    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, cameraRef.current!);

      // 首先检查是否点击了标签
      const allObjects = agentMeshesRef.current.children.flatMap((g: any) => {
        if (g instanceof THREE.Group) {
          return Array.from(g.children || []);
        }
        return [];
      });

      const labelIntersects = raycaster.intersectObjects(allObjects, true);

      let clickedAgentData = null;

      for (const intersect of labelIntersects) {
        let obj: THREE.Object3D | null = intersect.object;
        while (obj) {
          if (obj.userData && obj.userData.isLabel && obj.userData.agentId) {
            clickedAgentData = obj.userData;
            break;
          }
          obj = obj.parent;
          if (!obj) break;
        }
        if (clickedAgentData) break;
      }

      // 如果没有点击标签，检查是否点击了Agent身体
      if (!clickedAgentData) {
        const bodyIntersects = raycaster.intersectObjects(agentMeshesRef.current.children, true);
        for (const intersect of bodyIntersects) {
          let obj = intersect.object;
          while (obj.parent && !obj.userData?.agentId) {
            obj = obj.parent;
          }
          if (obj.userData && obj.userData.agentId) {
            clickedAgentData = obj.userData;
            break;
          }
        }
      }

      if (clickedAgentData) {
        setInternalSelectedAgent(clickedAgentData.agentId);
        if (clickedAgentData.agentPosition) {
          // 平滑移动相机到Agent位置
          animateCameraToTarget(clickedAgentData.agentPosition);
        }
        if (onAgentClick) {
          onAgentClick(clickedAgentData.agentId);
        }
      }
    };

    const canvas = rendererRef.current.domElement;
    canvas.addEventListener('click', handleClick);
    return () => canvas.removeEventListener('click', handleClick);
  }, [sceneReady, onAgentClick]);

  // 如果不支持 WebGL，显示降级视图
  if (webGLError) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">3D 虚拟空间</h2>
            <p className="text-xs text-gray-500 mt-1">
              {agents.length} 个 Agent 在虚拟空间中活动
            </p>
          </div>
        </div>

        {/* WebGL 不支持提示 */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center mb-4">
          <p className="text-amber-800 mb-2">⚠️ 您的浏览器不支持 WebGL 3D 渲染</p>
          <p className="text-sm text-amber-700">
            当前服务器使用软件渲染，无法显示3D场景。请使用支持硬件加速的浏览器访问。
          </p>
        </div>

        {/* 降级视图：2D 俯视图 */}
        <div className="relative w-full h-96 bg-gradient-to-br from-blue-50 to-green-50 rounded-lg border border-gray-200 overflow-hidden">
          {/* 网格 */}
          <div className="absolute inset-0" style={{
            backgroundImage: `
              linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }} />

          {/* 坐标轴 */}
          <div className="absolute left-1/2 top-0 h-full w-0.5 bg-gray-400"></div>
          <div className="absolute left-0 top-1/2 w-full h-0.5 bg-gray-400"></div>

          {/* Agent 简化表示 */}
          {agents.map(agent => {
            const moodColor = moodColors[agent.mood] || '#6b7280';
            const screenX = 50 + agent.x * 2;
            const screenY = 50 + agent.z * 2;

            return (
              <div
                key={agent.agent_id}
                onClick={() => setInternalSelectedAgent(agent.agent_id)}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-125 transition-transform"
                style={{
                  left: `${screenX}%`,
                  top: `${screenY}%`,
                }}
                title={agent.agent_name}
              >
                {/* Agent 图标 */}
                <div className="relative">
                  <div className="w-6 h-6 rounded-full border-2 border-white shadow-lg" style={{ backgroundColor: moodColor }} />
                  {/* 阴影 */}
                  <div className="absolute inset-0 rounded-full bg-black/20 translate-y-1"></div>
                </div>
                {/* 名字标签 */}
                <div className="absolute top-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <span className="text-xs font-medium text-gray-900 bg-white/80 px-2 py-0.5 rounded">
                    {agent.agent_name}
                  </span>
                </div>
              </div>
            );
          })}

          {/* 建筑 */}
          {buildings.map(building => {
            const screenX = 50 + building.x * 2;
            const screenY = 50 + building.z * 2;
            const width = building.width * 2;
            const depth = building.depth * 2;

            return (
              <div
                key={building.id}
                className="absolute border-2 border-gray-600 bg-gray-300/50 shadow-lg"
                style={{
                  left: `calc(${screenX}% - ${width/2}px)`,
                  top: `calc(${screenY}% - ${depth/2}px)`,
                  width: `${width}px`,
                  height: `${depth}px`,
                  backgroundColor: building.color,
                }}
              />
            );
          })}
        </div>

        {/* 说明 */}
        <div className="mt-2 text-xs text-gray-500">
          💡 这是2D俯视图。请使用支持硬件加速的浏览器查看3D效果。
        </div>

        {/* Agent 列表 */}
        <div className="mt-4 grid grid-cols-5 gap-2">
          {agents.map(agent => {
            const moodColor = moodColors[agent.mood] || '#6b7280';
            return (
              <button
                key={agent.agent_id}
                onClick={() => setInternalSelectedAgent(agent.agent_id)}
                className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
                  currentSelectedAgent === agent.agent_id
                    ? 'border-world-500 bg-world-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: moodColor }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{agent.agent_name}</div>
                  <div className="text-xs text-gray-500">能量 {agent.energy}%</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* 选中 Agent 详情 */}
        {currentSelectedAgent && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            {agents.filter(a => a.agent_id === currentSelectedAgent).map(agent => (
              <div key={agent.agent_id}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: moodColors[agent.mood] || '#6b7280' }} />
                  <span className="font-medium text-gray-900">{agent.agent_name}</span>
                </div>
                <div className="text-sm text-gray-600">
                  <div>位置: ({agent.x.toFixed(1)}, {agent.z.toFixed(1)})</div>
                  <div>能量: {agent.energy}% | 心情: {agent.mood}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 正常视图内容
  const normalView = (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">3D 虚拟空间</h2>
          <p className="text-xs text-gray-500 mt-1">
            {agents.length} 个 Agent | {buildings.length} 个建筑
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* 视角切换按钮 */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setCurrentViewMode('third-person')}
              className={`px-3 py-1 text-xs rounded-md transition-all ${
                viewMode === 'third-person'
                  ? 'bg-white text-world-700 font-medium shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="第三人称视角（自由视角）"
            >
              第三人称
            </button>
            <button
              onClick={() => setCurrentViewMode('second-person')}
              className={`px-3 py-1 text-xs rounded-md transition-all ${
                viewMode === 'second-person'
                  ? 'bg-white text-world-700 font-medium shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="第二人称视角（跟踪视角）"
              disabled={!currentSelectedAgent}
            >
              第二人称
            </button>
            <button
              onClick={() => setCurrentViewMode('first-person')}
              className={`px-3 py-1 text-xs rounded-md transition-all ${
                viewMode === 'first-person'
                  ? 'bg-white text-world-700 font-medium shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="第一人称视角（Agent视角）"
              disabled={!currentSelectedAgent}
            >
              第一人称
            </button>
          </div>

          {/* 全屏按钮 */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-gray-600"
            title={isFullscreen ? '退出全屏 (ESC)' : '全屏显示'}
          >
            {isFullscreen ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            )}
          </button>
        </div>
          <div className="text-xs text-gray-500">
            {sceneReady ? '🖱️ 拖动旋转 | 滚轮缩放' : '⏳ 加载中...'}
          </div>
      </div>

      {/* 3D 渲染区域 */}
      <div
        ref={containerRef}
        className={`relative overflow-hidden ${isFullscreen ? 'fixed inset-0 z-[9999] rounded-none border-0' : 'w-full rounded-lg border border-gray-200'}`}
        style={{ height: isFullscreen ? '100vh' : '600px' }}
      >
        {/* 全屏模式控制栏 - 仅在真正全屏时显示 */}
        {isFullscreen && (
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/70 to-transparent">
            <div className="text-white">
              <div className="text-sm font-medium">3D 虚拟空间 - 全屏模式</div>
              <div className="text-xs opacity-80">{agents.length} 个 Agent | {buildings.length} 个建筑</div>
            </div>

            <div className="flex items-center gap-2">
              {/* 视角切换 */}
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-1 flex items-center gap-1">
                <button
                  onClick={() => setCurrentViewMode('third-person')}
                  className={`px-3 py-1 text-xs rounded-md transition-all ${
                    viewMode === 'third-person'
                      ? 'bg-white/30 text-white'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  第三人称
                </button>
                <button
                  onClick={() => setCurrentViewMode('second-person')}
                  className={`px-3 py-1 text-xs rounded-md transition-all ${
                    viewMode === 'second-person'
                      ? 'bg-white/30 text-white'
                      : 'text-white/70 hover:text-white'
                  }`}
                  disabled={!currentSelectedAgent}
                >
                  第二人称
                </button>
                <button
                  onClick={() => setCurrentViewMode('first-person')}
                  className={`px-3 py-1 text-xs rounded-md transition-all ${
                    viewMode === 'first-person'
                      ? 'bg-white/30 text-white'
                      : 'text-white/70 hover:text-white'
                  }`}
                  disabled={!currentSelectedAgent}
                >
                  第一人称
                </button>
              </div>

              {/* 退出全屏按钮 */}
              <button
                onClick={toggleFullscreen}
                className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 text-white hover:bg-white/30 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                退出全屏 (ESC)
              </button>
            </div>
          </div>
        )}

        {/* Agent 选择器 - 全屏模式下显示在右侧 */}
        {isFullscreen && sceneReady && (
          <div className="absolute top-20 right-4 z-10 bg-black/70 backdrop-blur-sm rounded-lg p-3 text-white max-w-xs">
            <div className="text-sm font-medium mb-2">👥 选择 Agent</div>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {agents.map(agent => {
                const moodColor = moodColors[agent.mood] || '#6b7280';
                const isSelected = agent.agent_id === currentSelectedAgent;
                return (
                  <button
                    key={agent.agent_id}
                    onClick={() => {
                      setInternalSelectedAgent(agent.agent_id);
                      if (onAgentClick) {
                        onAgentClick(agent.agent_id);
                      }
                    }}
                    className={`flex items-center gap-2 w-full px-2 py-1.5 rounded text-left transition-all ${
                      isSelected
                        ? 'bg-white/30 border border-white/50'
                        : 'hover:bg-white/20 border border-transparent'
                    }`}
                  >
                    <div className="w-3 h-3 rounded-full border-2 border-white/50" style={{ backgroundColor: moodColor }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{agent.agent_name}</div>
                      <div className="text-xs opacity-70">能量 {agent.energy}%</div>
                    </div>
                  </button>
                );
              })}
            </div>
            {!currentSelectedAgent && (
              <div className="text-xs text-gray-300 mt-2 text-center">
                点击 Agent 选中后可用键盘控制
              </div>
            )}
          </div>
        )}

        {!sceneReady && !webGLError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 z-10">
            <div className="w-8 h-8 border-2 border-world-400 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-gray-500">正在初始化 3D 场景...</p>
          </div>
        )}
        {webGLError && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-50 z-10">
            <div className="text-center">
              <p className="text-red-600 font-medium">WebGL 不可用</p>
              <p className="text-sm text-gray-500 mt-1">请使用支持硬件加速的浏览器</p>
            </div>
          </div>
        )}

        {/* 键盘控制提示 - 仅在非移动端显示 */}
        {sceneReady && currentSelectedAgent && !isMobile && (
          <div className={`absolute z-10 bg-black/70 backdrop-blur-sm rounded-lg px-4 py-3 text-white ${
            isFullscreen ? 'bottom-8 left-8 px-6 py-4' : 'bottom-4 left-4'
          }`}>
            <div className={`${isFullscreen ? 'text-base' : 'text-sm'} font-medium mb-2`}>🎮 键盘控制</div>
            <div className={`grid ${isFullscreen ? 'grid-cols-3 gap-x-6 gap-y-2 text-sm' : 'grid-cols-2 gap-x-4 gap-y-1 text-xs'}`}>
              <div className="flex items-center gap-2">
                <span className={`${isFullscreen ? 'text-2xl' : 'text-base'}`}>⬆️</span>
                <span>向上</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`${isFullscreen ? 'text-2xl' : 'text-base'}`}>⬇️</span>
                <span>向下</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`${isFullscreen ? 'text-2xl' : 'text-base'}`}>⬅️</span>
                <span>向左</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`${isFullscreen ? 'text-2xl' : 'text-base'}`}>➡️</span>
                <span>向右</span>
              </div>
              <div className="flex items-center gap-2 col-span-2">
                <span className={`${isFullscreen ? 'text-2xl' : 'text-base'}`}>⎯</span>
                <span>跳跃</span>
              </div>
            </div>
            {isFullscreen && (
              <div className="mt-2 text-xs text-gray-300">当前控制: {agents.find(a => a.agent_id === currentSelectedAgent)?.agent_name || '未知'}</div>
            )}
          </div>
        )}
      </div>

      {/* Agent 列表 - 全屏模式下隐藏 */}
      {!isFullscreen && (
        <div className="mt-4 grid grid-cols-5 gap-2">
        {agents.map(agent => {
          const moodColor = moodColors[agent.mood] || '#6b7280';
          return (
            <button
              key={agent.agent_id}
              onClick={() => {
                setInternalSelectedAgent(agent.agent_id);
                if (onAgentClick) {
                  onAgentClick(agent.agent_id);
                }
              }}
              className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
                currentSelectedAgent === agent.agent_id
                  ? 'border-world-500 bg-world-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: moodColor }} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">{agent.agent_name}</div>
                <div className="text-xs text-gray-500">能量 {agent.energy}%</div>
              </div>
            </button>
          );
        })}
        </div>
      )}

      {/* 操作提示 - 全屏模式下隐藏 */}
      {sceneReady && !externalIsFullscreen && (
        <div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
          <span>
            💡 左键拖动旋转 | 右键拖动平移 | 滚轮缩放
            {currentSelectedAgent && ` | 当前追踪: ${agents.find(a => a.agent_id === currentSelectedAgent)?.agent_name}`}
          </span>
          <span>
            {viewMode === 'first-person' && '🎮 第一人称视角'}
            {viewMode === 'second-person' && '🎮 第二人称视角'}
            {viewMode === 'third-person' && '🎮 第三人称视角'}
          </span>
        </div>
      )}

      {/* 全屏模式控制栏 */}
      {externalIsFullscreen && (
        <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
          <div className="bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2 text-white">
            <div className="text-sm font-medium">3D 虚拟空间 - 北京地图</div>
            <div className="text-xs opacity-80">{agents.length} 个 Agent | {buildings.length} 个建筑</div>
          </div>

          <div className="flex items-center gap-2">
            {/* 视角切换 */}
            <div className="bg-black/50 backdrop-blur-sm rounded-lg p-1 flex items-center gap-1">
              <button
                onClick={() => setCurrentViewMode('third-person')}
                className={`px-3 py-1 text-xs rounded-md transition-all ${
                  viewMode === 'third-person'
                    ? 'bg-white/20 text-white'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                第三人称
              </button>
              <button
                onClick={() => setCurrentViewMode('second-person')}
                className={`px-3 py-1 text-xs rounded-md transition-all ${
                  viewMode === 'second-person'
                    ? 'bg-white/20 text-white'
                    : 'text-white/70 hover:text-white'
                }`}
                disabled={!currentSelectedAgent}
              >
                第二人称
              </button>
              <button
                onClick={() => setCurrentViewMode('first-person')}
                className={`px-3 py-1 text-xs rounded-md transition-all ${
                  viewMode === 'first-person'
                    ? 'bg-white/20 text-white'
                    : 'text-white/70 hover:text-white'
                }`}
                disabled={!currentSelectedAgent}
              >
                第一人称
              </button>
            </div>

            {/* 退出全屏按钮 */}
            <button
              onClick={toggleFullscreen}
              className="bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2 text-white hover:bg-black/70 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              退出全屏 (ESC)
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return normalView;
}
