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
  selectedAgentId?: string | null; // 外部传入选中的 Agent ID
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
  selectedAgentId,
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
  // 当前视角模式
  const [currentViewMode, setCurrentViewMode] = useState<ViewMode>('third-person');
  // 使用 ref 存储最新的视角模式，避免闭包陷阱
  const viewModeRef = useRef<ViewMode>(externalViewMode || 'third-person');
  // 当前追踪的 Agent（用于第一/第二人称视角）
  const trackedAgentRef = useRef<string | null>(null);
  const [webGLError, setWebGLError] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [sceneReady, setSceneReady] = useState(false);
  const [initAttempted, setInitAttempted] = useState(false);

  // 使用外部传入的视角模式，如果没有则使用内部状态
  const viewMode = externalViewMode || currentViewMode;

  // 更新 viewModeRef 以保持最新值
  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

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
      controls.minDistance = 30; // 调整最小距离
      controls.maxDistance = 500; // 扩大最大距离
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
      if (child instanceof THREE.Group) {
        child.clear();
      }
      group.remove(child);
    }

    // 添加新的 Agent
    agents.forEach(agent => {
      const agentGroup = new THREE.Group();
      agentGroup.position.set(agent.x, agent.y + 1, agent.z);

      const moodColor = moodColors[agent.mood] || '#6b7280';
      const skinColor = 0xffcc99;

      // === 下半身（腿和脚）===
      // 左腿
      const legGeometry = new THREE.CylinderGeometry(0.4, 0.3, 2.5, 8);
      const legMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
      const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
      leftLeg.position.set(-0.5, 1.25, 0);
      leftLeg.castShadow = true;
      agentGroup.add(leftLeg);
      leftLeg.userData = { part: 'leftLeg', initialY: 1.25 };

      // 左脚
      const footGeometry = new THREE.BoxGeometry(0.6, 0.3, 1);
      const footMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
      const leftFoot = new THREE.Mesh(footGeometry, footMaterial);
      leftFoot.position.set(-0.5, 0.15, 0.2);
      leftFoot.castShadow = true;
      agentGroup.add(leftFoot);
      leftFoot.userData = { part: 'leftFoot', parent: 'leftLeg' };

      // 右腿
      const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
      rightLeg.position.set(0.5, 1.25, 0);
      rightLeg.castShadow = true;
      agentGroup.add(rightLeg);
      rightLeg.userData = { part: 'rightLeg', initialY: 1.25 };

      // 右脚
      const rightFoot = new THREE.Mesh(footGeometry, footMaterial);
      rightFoot.position.set(0.5, 0.15, 0.2);
      rightFoot.castShadow = true;
      agentGroup.add(rightFoot);
      rightFoot.userData = { part: 'rightFoot', parent: 'rightLeg' };

      // === 躯干 ===
      const bodyGeometry = new THREE.CylinderGeometry(1.5, 1.8, 3.5, 16);
      const bodyMaterial = new THREE.MeshStandardMaterial({
        color: moodColor,
        metalness: 0.3,
        roughness: 0.7
      });
      const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
      body.position.y = 3.75;
      body.castShadow = true;
      agentGroup.add(body);

      // === 手臂 ===
      // 左臂
      const armGeometry = new THREE.CylinderGeometry(0.3, 0.25, 2.5, 8);
      const armMaterial = new THREE.MeshStandardMaterial({ color: moodColor });
      const leftArm = new THREE.Mesh(armGeometry, armMaterial);
      leftArm.position.set(-1.3, 4, 0);
      leftArm.rotation.z = Math.PI / 6; // 稍微张开
      leftArm.castShadow = true;
      agentGroup.add(leftArm);
      leftArm.userData = { part: 'leftArm', initialRotation: Math.PI / 6 };

      // 左手
      const handGeometry = new THREE.SphereGeometry(0.35, 16, 16);
      const handMaterial = new THREE.MeshStandardMaterial({ color: skinColor });
      const leftHand = new THREE.Mesh(handGeometry, handMaterial);
      leftHand.position.set(-1.8, 2.5, 0);
      leftHand.castShadow = true;
      agentGroup.add(leftHand);
      leftHand.userData = { part: 'leftHand', parent: 'leftArm' };

      // 右臂
      const rightArm = new THREE.Mesh(armGeometry, armMaterial);
      rightArm.position.set(1.3, 4, 0);
      rightArm.rotation.z = -Math.PI / 6;
      rightArm.castShadow = true;
      agentGroup.add(rightArm);
      rightArm.userData = { part: 'rightArm', initialRotation: -Math.PI / 6 };

      // 右手
      const rightHand = new THREE.Mesh(handGeometry, handMaterial);
      rightHand.position.set(1.8, 2.5, 0);
      rightHand.castShadow = true;
      agentGroup.add(rightHand);
      rightHand.userData = { part: 'rightHand', parent: 'rightArm' };

      // === 头部 ===
      const headGeometry = new THREE.SphereGeometry(1, 24, 24);
      const headMaterial = new THREE.MeshStandardMaterial({
        color: skinColor,
        metalness: 0.1,
        roughness: 0.5
      });
      const head = new THREE.Mesh(headGeometry, headMaterial);
      head.position.y = 6.2;
      head.castShadow = true;
      agentGroup.add(head);
      head.userData = { part: 'head' };

      // === 眼睛（更大更明显）===
      const eyeWhiteGeometry = new THREE.SphereGeometry(0.3, 16, 16);
      const eyeWhiteMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
      const leftEyeWhite = new THREE.Mesh(eyeWhiteGeometry, eyeWhiteMaterial);
      leftEyeWhite.position.set(-0.35, 6.3, 0.85);
      agentGroup.add(leftEyeWhite);

      const rightEyeWhite = new THREE.Mesh(eyeWhiteGeometry, eyeWhiteMaterial);
      rightEyeWhite.position.set(0.35, 6.3, 0.85);
      agentGroup.add(rightEyeWhite);

      // 瞳孔
      const pupilGeometry = new THREE.SphereGeometry(0.15, 16, 16);
      const pupilMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
      const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
      leftPupil.position.set(-0.35, 6.3, 1.05);
      agentGroup.add(leftPupil);
      leftPupil.userData = { part: 'leftPupil' };

      const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
      rightPupil.position.set(0.35, 6.3, 1.05);
      agentGroup.add(rightPupil);
      rightPupil.userData = { part: 'rightPupil' };

      // === 嘴巴（简单的微笑弧线）===
      const mouthGeometry = new THREE.TorusGeometry(0.2, 0.05, 8, 16, Math.PI);
      const mouthMaterial = new THREE.MeshStandardMaterial({ color: 0xcc6666 });
      const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
      mouth.position.set(0, 5.9, 0.85);
      mouth.rotation.x = Math.PI / 2;
      agentGroup.add(mouth);
      mouth.userData = { part: 'mouth' };

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
      label.position.set(0, 8, 0);
      label.userData = {
        isLabel: true,
        agentId: agent.agent_id,
        agentName: agent.agent_name,
        agentPosition: new THREE.Vector3(agent.x, agent.y + 1, agent.z)
      };
      agentGroup.add(label);

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
          mouth
        },
        // 动画状态
        animationState: {
          isWalking: false,
          isWaving: false,
          walkCycle: 0,
          waveCycle: 0
        }
      };

      // 初始化目标位置
      agentTargetPositionsRef.current.set(agent.agent_id, { x: agent.x, y: agent.y, z: agent.z });

      group.add(agentGroup);
    });

  }, [agents, sceneReady]);

  // 轮询更新 Agent 位置
  useEffect(() => {
    if (!sceneReady) return;

    const pollPositions = async () => {
      try {
        // 获取虚拟世界中的 Agent 位置
        const response = await fetch(getApiUrl('/api/v1/agents/virtual-positions'));
        if (!response.ok) return;

        const data = await response.json();

        // 更新目标位置
        data.agents.forEach((agent: any) => {
          agentTargetPositionsRef.current.set(agent.agent_id, {
            x: agent.x,
            y: agent.y,
            z: agent.z
          });
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
          const path = metadata?.path as THREE.Vector3[] | undefined;
          const width = metadata?.width as number ?? 15;

          if (path && path.length > 1) {
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
        mesh.position.set(feature.position.x, feature.position.y, feature.position.z);
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
    // 优先使用外部传入的 selectedAgentId，其次使用内部状态
    const trackedId = trackedAgentRef.current || selectedAgentId || selectedAgent;

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
        break;
    }
  };

  // 当外部传入的 selectedAgentId 改变时，更新追踪
  useEffect(() => {
    if (selectedAgentId) {
      trackedAgentRef.current = selectedAgentId;
      focusOnAgent(selectedAgentId);
    } else {
      trackedAgentRef.current = null;
    }
  }, [selectedAgentId]);

  // 当内部 selectedAgent 状态改变时，也更新追踪
  useEffect(() => {
    if (selectedAgent) {
      trackedAgentRef.current = selectedAgent;
      focusOnAgent(selectedAgent);
    } else {
      // 只有当外部也没有传入 selectedAgentId 时才清空追踪
      if (!selectedAgentId) {
        trackedAgentRef.current = null;
      }
    }
  }, [selectedAgent, selectedAgentId]);

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
        agentMeshesRef.current.children.forEach(agentGroup => {
          if (agentGroup instanceof THREE.Group && agentGroup.userData.parts) {
            const parts = agentGroup.userData.parts;

            // 平滑移动 Agent 到目标位置
            const agentId = agentGroup.userData.agentId;
            let isMoving = false;

            if (agentId && agentTargetPositionsRef.current.has(agentId)) {
              const targetPos = agentTargetPositionsRef.current.get(agentId)!;
              const currentPos = agentGroup.position;
              const lerpFactor = 0.02; // 移动速度

              // 计算到目标的距离
              const dx = targetPos.x - currentPos.x;
              const dz = targetPos.z - currentPos.z;
              const distance = Math.sqrt(dx * dx + dz * dz);

              // 判断是否正在移动
              isMoving = distance > 1;
              agentIsMovingRef.current.set(agentId, isMoving);

              // 线性插值到目标位置
              agentGroup.position.x += dx * lerpFactor;
              agentGroup.position.z += dz * lerpFactor;

              // 移动时让 Agent 面向目标方向
              if (isMoving) {
                const targetAngle = Math.atan2(dx, dz);
                agentGroup.rotation.y = THREE.MathUtils.lerp(
                  agentGroup.rotation.y,
                  targetAngle,
                  0.1
                );
              }
            }

            // 行走动画 - 只有在移动时才播放
            if (isMoving) {
              // 大幅度的腿部摆动（行走）
              const walkCycle = Math.sin(time * 8); // 更快的行走频率
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
                parts.leftArm.rotation.z = Math.PI / 6;
              }
              if (parts.rightArm) {
                parts.rightArm.rotation.x = walkCycle * legSwingAngle * 0.8;
                parts.rightArm.rotation.z = -Math.PI / 6;
              }

              // 身体轻微上下起伏（行走时）
              if (parts.head) {
                parts.head.position.y = 6.2 + Math.abs(Math.sin(time * 8)) * 0.15;
              }
            } else {
              // 静止时的动画
              // 呼吸动画（头部轻微上下浮动）
              if (parts.head) {
                parts.head.position.y = 6.2 + Math.sin(time * 2) * 0.05;
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
        setSelectedAgent(clickedAgentData.agentId);
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
                  selectedAgent === agent.agent_id
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
        {selectedAgent && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            {agents.filter(a => a.agent_id === selectedAgent).map(agent => (
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

  return (
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
              disabled={!selectedAgent}
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
              disabled={!selectedAgent}
            >
              第一人称
            </button>
          </div>
        </div>
          <div className="text-xs text-gray-500">
            {sceneReady ? '🖱️ 拖动旋转 | 滚轮缩放' : '⏳ 加载中...'}
          </div>
      </div>

      {/* 3D 渲染区域 */}
      <div
        ref={containerRef}
        className="relative w-full h-96 rounded-lg border border-gray-200 overflow-hidden"
        style={{ minHeight: '384px' }}
      >
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
      </div>

      {/* Agent 列表 */}
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
                selectedAgent === agent.agent_id
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

      {/* 操作提示 */}
      {sceneReady && (
        <div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
          <span>
            💡 左键拖动旋转 | 右键拖动平移 | 滚轮缩放
            {selectedAgent && ` | 当前追踪: ${agents.find(a => a.agent_id === selectedAgent)?.agent_name}`}
          </span>
          <span>
            {viewMode === 'first-person' && '🎮 第一人称视角'}
            {viewMode === 'second-person' && '🎮 第二人称视角'}
            {viewMode === 'third-person' && '🎮 第三人称视角'}
          </span>
        </div>
      )}
    </div>
  );
}
