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
  onVehicleClick,
  enableTerrain = true,
  enableRoads = true,
  enableVehicles = true,
  externalIsFullscreen: externalIsFullscreen = false,
  onFullscreenChange,
  isMobile = false,
  isTouchDevice: _isTouchDevice = false,
}: VirtualSpace3DProps) {
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
  // 当前视角模式
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

  // 使用 ref 存储当前选中的 Agent，避免动画循环闭包问题
  const currentSelectedAgentRef = useRef<string | null>(currentSelectedAgent);

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
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

      if (!gl) {
        setWebGLError(true);
      }
    } catch (e) {
      setWebGLError(true);
    }
  }, []);

  // 初始化 Three.js 场景 - 只运行一次
  useEffect(() => {
    // 如果WebGL不支持，直接返回
    if (webGLError) return;

    // 如果已经初始化过，直接返回
    if (sceneReady || initAttempted) return;

    if (!containerRef.current) return;

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
      scene.fog = new THREE.Fog(0x87CEEB, 100, 800); // 扩大雾效范围
      sceneRef.current = scene;

      // 创建相机 - 调整为适合大地图的位置
      const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 2000);
      camera.position.set(200, 150, 200); // 适应更大地图
      camera.lookAt(0, 0, 0);
      cameraRef.current = camera;

      // 创建渲染器
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      renderer.setClearColor(0x87CEEB, 1);
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // 添加轨道控制器
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.autoRotate = false;
      controls.maxPolarAngle = Math.PI / 2 - 0.1; // 限制不能钻到地下
      controls.minDistance = 50; // 调整最小距离
      controls.maxDistance = 1500; // 扩大最大距离以查看整个场景
      controls.target.set(0, 0, 0); // 设置旋转中心点
      controlsRef.current = controls;

      // 添加光源 - 扩大光照范围
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(200, 300, 200);
      directionalLight.castShadow = true;
      directionalLight.shadow.mapSize.width = 4096;
      directionalLight.shadow.mapSize.height = 4096;
      directionalLight.shadow.camera.near = 1;
      directionalLight.shadow.camera.far = 1000;
      directionalLight.shadow.camera.left = -500;
      directionalLight.shadow.camera.right = 500;
      directionalLight.shadow.camera.top = 500;
      directionalLight.shadow.camera.bottom = -500;
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

      const vehiclesGroup = new THREE.Group();
      vehiclesGroup.name = 'VehiclesGroup';
      scene.add(vehiclesGroup);
      (sceneRef.current as any).vehiclesGroup = vehiclesGroup;

      // 添加基础地面（绿色草地）作为视觉参考
      const groundGeometry = new THREE.PlaneGeometry(2000, 2000);
      const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x7cfc00,
        roughness: 0.9,
        metalness: 0
      });
      const ground = new THREE.Mesh(groundGeometry, groundMaterial);
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.1; // 略低于其他元素
      ground.receiveShadow = true;
      ground.name = 'Ground';
      scene.add(ground);

      // 添加地面（如果没有启用地形）
      if (!enableTerrain) {
        const groundGeometry = new THREE.PlaneGeometry(1000, 1000);
        const groundMaterial = new THREE.MeshStandardMaterial({
          color: 0x7cfc00,
          roughness: 0.8
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        scene.add(ground);
      }

      // 添加 Agent 组
      agentMeshesRef.current = new THREE.Group();
      scene.add(agentMeshesRef.current);

      setSceneReady(true);

    } catch (error) {
      console.error('Failed to initialize Three.js:', error);
      setWebGLError(true);
    }

    // 清理函数 - 只在组件真正卸载时执行
    return () => {
      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (containerRef.current && rendererRef.current.domElement && containerRef.current.contains(rendererRef.current.domElement)) {
          containerRef.current.removeChild(rendererRef.current.domElement);
        }
        rendererRef.current = null;
      }
    };
  }, [enableTerrain]); // 添加 enableTerrain 依赖

  // 更新 Agent 显示
  useEffect(() => {
    if (!sceneReady || !sceneRef.current) return;

    const group = agentMeshesRef.current;

    // 清除旧的 Agent
    while (group.children.length > 0) {
      const child = group.children[0];
      if (child.userData.agentId) {
        // 清除该 Agent 的相关数据
        agentRotationsRef.current.delete(child.userData.agentId);
        agentPhysicsRef.current.delete(child.userData.agentId);
        agentTargetPositionsRef.current.delete(child.userData.agentId);
      }
      if (child instanceof THREE.Group) {
        child.clear();
      }
      group.remove(child);
    }

    // 添加新的 Agent - 动漫 Q 版风格
    agents.forEach(agent => {
      const agentGroup = new THREE.Group();
      agentGroup.position.set(agent.x, agent.y + 1, agent.z);

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
      leftLeg.position.set(-0.4, 0.9, 0);
      leftLeg.castShadow = true;
      agentGroup.add(leftLeg);
      leftLeg.userData = { part: 'leftLeg', initialY: 0.9 };

      // 右腿
      const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
      rightLeg.position.set(0.4, 0.9, 0);
      rightLeg.castShadow = true;
      agentGroup.add(rightLeg);
      rightLeg.userData = { part: 'rightLeg', initialY: 0.9 };

      // === Q版鞋子（圆润）===
      const shoeGeometry = new THREE.SphereGeometry(0.45, 16, 16);
      shoeGeometry.scale(1.3, 0.7, 1.5);
      const shoeMaterial = new THREE.MeshStandardMaterial({ color: 0x222233 });
      const leftShoe = new THREE.Mesh(shoeGeometry, shoeMaterial);
      leftShoe.position.set(-0.4, 0.25, 0.15);
      leftShoe.castShadow = true;
      agentGroup.add(leftShoe);
      leftShoe.userData = { part: 'leftShoe', parent: 'leftLeg' };

      const rightShoe = new THREE.Mesh(shoeGeometry, shoeMaterial);
      rightShoe.position.set(0.4, 0.25, 0.15);
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
      agentTargetPositionsRef.current.set(agent.agent_id, { x: agent.x, y: agent.y, z: agent.z });
      agentRotationsRef.current.set(agent.agent_id, agentGroup.rotation.y);
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

    // 移除旧建筑（保留 Agent、地面和辅助线）
    sceneRef.current.children.forEach(child => {
      if (child instanceof THREE.Group && child !== agentMeshesRef.current) {
        if (child.userData.isBuilding) {
          sceneRef.current!.remove(child);
        }
      }
    });

    // 添加新建筑
    buildings.forEach(building => {
      const buildingGroup = new THREE.Group();
      buildingGroup.position.set(building.x, building.y + building.height / 2, building.z);
      buildingGroup.userData = { isBuilding: true };

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

      sceneRef.current!.add(buildingGroup);
    });

  }, [buildings, sceneReady]);

  // 渲染地形
  useEffect(() => {
    if (!sceneReady || !sceneRef.current || !enableTerrain) return;

    const terrainGroup = (sceneRef.current as any).terrainGroup as THREE.Group;
    if (!terrainGroup) return;

    // 清空现有地形
    while (terrainGroup.children.length > 0) {
      const child = terrainGroup.children[0];
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
      terrainGroup.remove(child);
    }

    // 渲染地形特征
    terrainFeatures.forEach(feature => {
      let mesh: THREE.Object3D | null = null;

      if (feature.type === 'mountain') {
        const metadata = feature.metadata as Record<string, unknown> | undefined;
        const hasSnowCap = metadata?.hasSnowCap as boolean ?? false;
        const snowCapHeight = metadata?.snowCapHeight as number ?? 50;
        const roughness = metadata?.roughness as number ?? 0.7;
        const color = metadata?.color as string | undefined;

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

        if (feature.type === 'river') {
          const pathData = metadata?.path as Array<{ x: number; y: number; z: number }> | undefined;
          const width = metadata?.width as number ?? 15;

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
              segment.position.set(midX, 0.5, midZ);
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
        // 山和山丘应该放在地面上（y=0），忽略后端返回的 y 坐标
        const yPos = (feature.type === 'mountain' || feature.type === 'hill') ? 0 : feature.position.y;
        mesh.position.set(feature.position.x, yPos, feature.position.z);
        mesh.name = feature.name || `Terrain_${feature.id}`;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        terrainGroup.add(mesh);
      }
    });

  }, [terrainFeatures, sceneReady, enableTerrain]);

  // 渲染道路
  useEffect(() => {
    if (!sceneReady || !sceneRef.current || !enableRoads) return;

    const roadsGroup = (sceneRef.current as any).roadsGroup as THREE.Group;
    if (!roadsGroup) return;

    // 清空现有道路
    while (roadsGroup.children.length > 0) {
      const child = roadsGroup.children[0];
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
      roadsGroup.remove(child);
    }

    // 渲染道路
    roads.forEach(road => {
      if (!road.path || road.path.length < 2) return;

      const roadColor = getRoadColor(road.type);
      const path = road.path.map(p => new THREE.Vector3(p.x, p.y, p.z));

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

        // 车道标线
        if (road.lanes > 1 && road.has_lane_markings !== false) {
          addLaneMarkings(roadsGroup, start, end, road.width, road.lanes, angle);
        }

        // 边缘线
        addEdgeMarkings(roadsGroup, start, end, road.width, angle);
      }
    });

    // 渲染路口
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
      }
    });

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

    // 渲染车辆
    vehicles.forEach(vehicle => {
      const vehicleMesh = createVehicleMesh(vehicle);
      if (vehicleMesh) {
        vehiclesGroup.add(vehicleMesh);
      }
    });

  }, [vehicles, sceneReady, enableVehicles, onVehicleClick]);

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

              // 更新目标位置以响应键盘控制
              if (keyboardMoveX !== 0 || keyboardMoveZ !== 0) {
                const currentPos = agentGroup.position;
                const newTargetPos = {
                  x: currentPos.x + keyboardMoveX * 10, // 预测位置
                  y: currentPos.y,
                  z: currentPos.z + keyboardMoveZ * 10,
                };
                agentTargetPositionsRef.current.set(agentId, newTargetPos);
              }
            }

            // 平滑移动 Agent 到目标位置
            let isMoving = false;

            if (agentId && agentTargetPositionsRef.current.has(agentId)) {
              const targetPos = agentTargetPositionsRef.current.get(agentId)!;
              const currentPos = agentGroup.position;
              const lerpFactor = isSelected ? 0.08 : 0.02; // 选中时移动更快

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

              // 碰撞检测：检查新位置是否会与其他 Agent 碰撞
              const collisionRadius = 3.5; // Q版 Agent 的碰撞半径
              let hasCollision = false;

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
                      // 如果是键盘控制的 Agent，停止移动
                      if (isSelected) {
                        agentTargetPositionsRef.current.set(agentId, {
                          x: currentPos.x,
                          y: currentPos.y,
                          z: currentPos.z
                        });
                      }
                      break;
                    }
                  }
                }
              }

              // 只有在没有碰撞时才更新位置
              if (!hasCollision) {
                agentGroup.position.x = newX;
                agentGroup.position.z = newZ;
              } else if (isSelected) {
                // 碰撞时显示调试信息
                console.log(`[Collision] Agent ${agentId} collision detected, stopping movement`);
              }
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
                onClick={() => setSelectedAgent(agent.agent_id)}
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
                onClick={() => setSelectedAgent(agent.agent_id)}
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
                setSelectedAgent(agent.agent_id);
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
