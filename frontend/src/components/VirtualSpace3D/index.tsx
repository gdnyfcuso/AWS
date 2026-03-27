/**
 * VirtualSpace3D - 重构后的主组件
 * 3D 虚拟空间查看器，集成地形、道路网络和车辆系统
 */

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Agent3D, Building3D, River3D, VirtualSpace3DProps } from './types';
import { useThreeScene } from './hooks/useThreeScene';
import { useCameraControls } from './hooks/useCameraControls';
import { useAgentPhysics } from './hooks/useAgentPhysics';
import { useKeyboardControls } from './hooks/useKeyboardControls';
import { createVehicleMesh } from './renderers/VehicleRenderer';
import { getRoadColor, addLaneMarkings, addEdgeMarkings } from './utils/roadUtils';
import { MOOD_COLORS } from './utils/vehicleConfigs';
import { geometryGenerator, materialFactory, CARTOON_COLORS } from '../../utils/threejs/GeometryGenerator';
import { getApiUrl } from '../../utils/api';
import { TerrainFeatureData } from '../TerrainRenderer';
import { RoadData, IntersectionData } from '../RoadRenderer';
import { VehicleData } from '../VehicleRenderer';

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
  externalIsFullscreen = false,
  onFullscreenChange,
  isMobile = false,
  isTouchDevice = false,
}: VirtualSpace3DProps) {
  // 实例 ID（用于调试）
  const instanceId = useRef<string>(Math.random().toString(36).substring(7));

  // 使用自定义 hooks
  const { containerRef, sceneRef, cameraRef, rendererRef, isReady: sceneReady, error: webGLError } = useThreeScene({
    enableShadows: true,
    backgroundColor: 0x87CEEB,
  });

  const { controlsRef, updateCameraForViewMode } = useCameraControls({
    cameraRef,
    rendererRef,
    viewMode: externalViewMode || 'third-person',
    agents,
  });

  const { agentPhysicsRef, updateAgentPhysics, setAgentGround } = useAgentPhysics();
  const { keysPressedRef } = useKeyboardControls();

  // 本地状态
  const [currentViewMode, setCurrentViewMode] = useState<'first-person' | 'second-person' | 'third-person'>('third-person');
  const [internalSelectedAgent, setInternalSelectedAgent] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 其他 refs
  const agentMeshesRef = useRef<THREE.Group>(new THREE.Group());
  const vehicleMeshesRef = useRef<THREE.Group>(new THREE.Group());
  const terrainMeshesRef = useRef<THREE.Group>(new THREE.Group());
  const roadMeshesRef = useRef<THREE.Group>(new THREE.Group());
  const isAnimatingRef = useRef(false);

  // 当前选中的 Agent
  const currentSelectedAgent = currentSelectedAgentId || internalSelectedAgent;

  // 全屏切换
  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => {
        setIsFullscreen(true);
        onFullscreenChange?.(true);
      }).catch(err => {
        console.error('Failed to enter fullscreen:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
        onFullscreenChange?.(false);
      });
    }
  };

  // 监听全屏变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isCurrentlyFullscreen);
      onFullscreenChange?.(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [onFullscreenChange]);

  // 渲染地形
  useEffect(() => {
    if (!sceneRef.current || !enableTerrain) return;

    // 清除旧的地形
    terrainMeshesRef.current.clear();

    const terrainGroup = new THREE.Group();

    // 渲染地形特征
    terrainFeatures.forEach(feature => {
      // 根据特征类型渲染不同的地形
      // TODO: 实现地形渲染逻辑
    });

    sceneRef.current.add(terrainMeshesRef.current);
    terrainMeshesRef.current.add(terrainGroup);
  }, [sceneRef, terrainFeatures, enableTerrain]);

  // 渲染道路
  useEffect(() => {
    if (!sceneRef.current || !enableRoads) return;

    // 清除旧的道路
    roadMeshesRef.current.clear();

    const roadGroup = new THREE.Group();

    roads.forEach(road => {
      const color = getRoadColor(road.type);

      // 创建道路几何体
      const points = road.path.map(p => new THREE.Vector3(p.x, p.y, p.z));
      const curve = new THREE.CatmullRomCurve3(points);
      const roadGeometry = new THREE.TubeGeometry(curve, 64, road.width / 2, 8, false);
      const roadMaterial = new THREE.MeshStandardMaterial({ color });
      const roadMesh = new THREE.Mesh(roadGeometry, roadMaterial);

      roadMesh.position.y = 0.1;
      roadMesh.castShadow = true;
      roadMesh.receiveShadow = true;

      roadGroup.add(roadMesh);

      // 添加车道标线
      if (road.lanes && road.lanes > 1) {
        for (let i = 0; i < points.length - 1; i++) {
          const start = points[i];
          const end = points[i + 1];
          const angle = Math.atan2(end.z - start.z, end.x - start.x);

          addLaneMarkings(roadGroup, start, end, road.width, road.lanes, angle);
        }
      }

      // 添加边缘线
      for (let i = 0; i < points.length - 1; i++) {
        const start = points[i];
        const end = points[i + 1];
        const angle = Math.atan2(end.z - start.z, end.x - start.x);

        addEdgeMarkings(roadGroup, start, end, road.width, angle);
      }
    });

    sceneRef.current.add(roadMeshesRef.current);
    roadMeshesRef.current.add(roadGroup);
  }, [sceneRef, roads, enableRoads]);

  // 渲染车辆
  useEffect(() => {
    if (!sceneRef.current || !enableVehicles) return;

    vehicleMeshesRef.current.clear();

    const vehicleGroup = new THREE.Group();

    vehicles.forEach(vehicle => {
      const vehicleMesh = createVehicleMesh(vehicle);
      if (vehicleMesh) {
        vehicleGroup.add(vehicleMesh);
      }
    });

    sceneRef.current.add(vehicleMeshesRef.current);
    vehicleMeshesRef.current.add(vehicleGroup);
  }, [sceneRef, vehicles, enableVehicles]);

  // 渲染 Agent
  useEffect(() => {
    if (!sceneRef.current) return;

    agentMeshesRef.current.clear();

    const agentGroup = new THREE.Group();

    agents.forEach(agent => {
      // 创建 Agent 3D 表示
      const agentGeometry = new THREE.CapsuleGeometry(1, 2, 4, 8);
      const moodColor = MOOD_COLORS[agent.mood] || MOOD_COLORS.neutral;
      const agentMaterial = new THREE.MeshStandardMaterial({ color: moodColor });
      const agentMesh = new THREE.Mesh(agentGeometry, agentMaterial);

      agentMesh.position.set(agent.x, agent.y + 2, agent.z);
      agentMesh.castShadow = true;
      agentMesh.receiveShadow = true;
      agentMesh.userData = { agentId: agent.agent_id };

      // 添加选中指示器
      if (agent.agent_id === currentSelectedAgent) {
        const indicatorGeometry = new THREE.RingGeometry(1.5, 2, 32);
        const indicatorMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00, side: THREE.DoubleSide });
        const indicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
        indicator.rotation.x = -Math.PI / 2;
        indicator.position.y = -1;
        agentMesh.add(indicator);
      }

      // 设置地面高度
      setAgentGround(agent.agent_id, 0);

      agentGroup.add(agentMesh);
    });

    sceneRef.current.add(agentMeshesRef.current);
    agentMeshesRef.current.add(agentGroup);
  }, [sceneRef, agents, currentSelectedAgent, setAgentGround]);

  // 渲染建筑
  useEffect(() => {
    if (!sceneRef.current) return;

    buildings.forEach(building => {
      const buildingGeometry = new THREE.BoxGeometry(building.width, building.height, building.depth);
      const buildingMaterial = new THREE.MeshStandardMaterial({ color: building.color });
      const buildingMesh = new THREE.Mesh(buildingGeometry, buildingMaterial);

      buildingMesh.position.set(building.x, building.y + building.height / 2, building.z);
      buildingMesh.castShadow = true;
      buildingMesh.receiveShadow = true;

      sceneRef.current?.add(buildingMesh);
    });
  }, [sceneRef, buildings]);

  // 动画循环
  useEffect(() => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current || isAnimatingRef.current) return;

    isAnimatingRef.current = true;

    const animate = () => {
      requestAnimationFrame(animate);

      if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;

      // 更新控制器
      if (controlsRef.current) {
        controlsRef.current.update();
      }

      // 渲染场景
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    };

    animate();

    return () => {
      isAnimatingRef.current = false;
    };
  }, [sceneReady]);

  // 错误处理
  if (webGLError) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100">
        <div className="text-center">
          <p className="text-red-500 mb-2">WebGL 不可用</p>
          <p className="text-sm text-gray-600">您的浏览器不支持 WebGL，无法显示 3D 内容。</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative"
      style={{ touchAction: 'none' }}
    >
      {/* 3D 渲染区域由 Three.js 管理 */}

      {/* UI 控件 */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button
          onClick={toggleFullscreen}
          className="bg-white/80 hover:bg-white px-3 py-2 rounded shadow"
          title={isFullscreen ? '退出全屏' : '全屏'}
        >
          {isFullscreen ? '⛶' : '⛶'}
        </button>
      </div>

      {/* 视角切换 */}
      <div className="absolute bottom-4 left-4 flex gap-2">
        <button
          onClick={() => setCurrentViewMode('third-person')}
          className={`px-3 py-2 rounded shadow ${currentViewMode === 'third-person' ? 'bg-blue-500 text-white' : 'bg-white/80'}`}
        >
          第三人称
        </button>
        <button
          onClick={() => setCurrentViewMode('first-person')}
          className={`px-3 py-2 rounded shadow ${currentViewMode === 'first-person' ? 'bg-blue-500 text-white' : 'bg-white/80'}`}
        >
          第一人称
        </button>
        <button
          onClick={() => setCurrentViewMode('second-person')}
          className={`px-3 py-2 rounded shadow ${currentViewMode === 'second-person' ? 'bg-blue-500 text-white' : 'bg-white/80'}`}
        >
          第二人称
        </button>
      </div>

      {/* 调试信息 */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-4 left-4 bg-black/50 text-white p-2 rounded text-xs">
          <div>Agent: {agents.length}</div>
          <div>Buildings: {buildings.length}</div>
          <div>Vehicles: {vehicles.length}</div>
          <div>Roads: {roads.length}</div>
          <div>Instance: {instanceId.current}</div>
        </div>
      )}
    </div>
  );
}

export default VirtualSpace3D;
