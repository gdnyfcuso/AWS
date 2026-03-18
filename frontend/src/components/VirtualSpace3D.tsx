// 3D 虚拟空间查看器 - 使用 Three.js

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
// @ts-ignore - OrbitControls import
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

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
}

const moodColors: Record<string, string> = {
  happy: '#22c55e',
  sad: '#3b82f6',
  angry: '#ef4444',
  neutral: '#6b7280',
  focused: '#8b5cf6',
  relaxed: '#06b6d4',
};

export function VirtualSpace3D({ agents, buildings, onAgentClick }: VirtualSpace3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<any>(null);
  const agentMeshesRef = useRef<THREE.Group>(new THREE.Group());
  const [webGLError, setWebGLError] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [sceneReady, setSceneReady] = useState(false);
  const [initAttempted, setInitAttempted] = useState(false);

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
      scene.fog = new THREE.Fog(0x87CEEB, 100, 500);
      sceneRef.current = scene;

      // 创建相机
      const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
      camera.position.set(100, 100, 100);
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
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.setClearColor(0x87CEEB, 1);
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // 添加轨道控制器
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.autoRotate = false; // 不自动旋转
      controls.maxPolarAngle = Math.PI / 2 - 0.1; // 限制不能钻到地下
      controls.minDistance = 20;
      controls.maxDistance = 300;
      controlsRef.current = controls;

      // 添加光源
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(50, 100, 50);
      directionalLight.castShadow = true;
      directionalLight.shadow.mapSize.width = 2048;
      directionalLight.shadow.mapSize.height = 2048;
      directionalLight.shadow.camera.near = 0.5;
      directionalLight.shadow.camera.far = 500;
      directionalLight.shadow.camera.left = -100;
      directionalLight.shadow.camera.right = 100;
      directionalLight.shadow.camera.top = 100;
      directionalLight.shadow.camera.bottom = -100;
      scene.add(directionalLight);

      // 添加地面
      const groundGeometry = new THREE.PlaneGeometry(500, 500);
      const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x7cfc00,
        roughness: 0.8
      });
      const ground = new THREE.Mesh(groundGeometry, groundMaterial);
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      scene.add(ground);
      console.log('Ground added');

      // 添加网格辅助线
      const gridHelper = new THREE.GridHelper(500, 50, 0x000000, 0x444444);
      gridHelper.position.y = 0.1;
      scene.add(gridHelper);

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
  }, []); // 空依赖数组，只运行一次

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

      // Agent 身体（圆柱体）
      const bodyGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1.5, 8);
      const moodColor = moodColors[agent.mood] || '#6b7280';
      const bodyMaterial = new THREE.MeshStandardMaterial({ color: moodColor });
      const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
      body.position.y = 0.75;
      body.castShadow = true;
      agentGroup.add(body);

      // Agent 头部（球体）
      const headGeometry = new THREE.SphereGeometry(0.4, 16, 16);
      const headMaterial = new THREE.MeshStandardMaterial({ color: 0xffcc99 });
      const head = new THREE.Mesh(headGeometry, headMaterial);
      head.position.y = 1.8;
      head.castShadow = true;
      agentGroup.add(head);

      // 添加点击事件
      agentGroup.userData = { agentId: agent.agent_id };
      group.add(agentGroup);
    });

  }, [agents, sceneReady]);

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

  // 动画循环
  useEffect(() => {
    if (!sceneReady || !rendererRef.current || !cameraRef.current) return;

    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      if (controlsRef.current) {
        controlsRef.current.update();
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
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

  // 处理点击事件
  useEffect(() => {
    if (!sceneReady || !rendererRef.current) return;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, cameraRef.current!);

      const intersects = raycaster.intersectObjects(agentMeshesRef.current.children, true);

      if (intersects.length > 0) {
        let obj = intersects[0].object;
        while (obj.parent && !obj.userData.agentId) {
          obj = obj.parent;
        }
        if (obj.userData.agentId) {
          setSelectedAgent(obj.userData.agentId);
          if (onAgentClick) {
            onAgentClick(obj.userData.agentId);
          }
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

      {/* 操作提示 */}
      {sceneReady && (
        <div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
          <span>💡 左键拖动旋转 | 右键拖动平移 | 滚轮缩放</span>
        </div>
      )}
    </div>
  );
}
