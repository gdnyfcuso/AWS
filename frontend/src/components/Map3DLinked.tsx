// 真实地图与3D虚拟空间联动组件 - 带Agent实时显示
// 使用1:1比例坐标系统 (1虚拟单位 = 1米)

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MapPin, Layers, Cube, Sync, Users, RefreshCw } from 'lucide-react';
import {
  getConverter,
  CITIES_CONFIG,
  latLngToMeters,
  calculateVirtualSize,
  type GeoCoordinates,
  type VirtualCoordinates,
} from '../utils/coordinates';

const API_BASE = 'http://100.64.0.131:3000/api/v1';

// Agent数据类型
interface AgentData {
  agent_id: string;
  agent_name: string;
  latitude?: number;
  longitude?: number;
  city?: string;
  address?: string;
  energy: number;
  mood: string;
  status: string;
  last_seen?: string;
}

// 地理边界配置 - 用于过滤Agent
interface RegionBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

// 真实地理坐标与3D虚拟空间的映射配置
interface Region3DMapping {
  id: string;
  name: string;
  realCoords: { lat: number; lng: number };
  zoom: number;
  virtualCenter: { x: number; y: number; z: number };
  virtualSize: { width: number; depth: number };
  cameraPosition: { x: number; y: number; z: number };
  bounds?: RegionBounds;
  buildings: Array<{
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
  }>;
}

// 计算城市的1:1虚拟空间尺寸
function getCityVirtualSize(cityId: string): { width: number; depth: number } {
  const cityConfig = CITIES_CONFIG[cityId];
  if (!cityConfig) {
    return { width: 50000, depth: 50000 }; // 默认50km
  }
  return calculateVirtualSize(cityConfig.bounds);
}

// 计算适合整个城市的相机位置
function getCityCameraPosition(cityId: string): { x: number; y: number; z: number } {
  const size = getCityVirtualSize(cityId);
  const maxDimension = Math.max(size.width, size.depth);
  const distance = maxDimension * 0.8; // 相机距离为最大尺寸的80%
  const position = {
    x: distance * 0.7,
    y: distance * 0.5,
    z: distance * 0.7,
  };
  console.log(`[Map3DLinked] Camera position for ${cityId}:`, {
    citySize: size,
    maxDimension: maxDimension.toFixed(0),
    cameraDistance: distance.toFixed(0),
    cameraPosition: position,
  });
  return position;
}

// 主要城市的3D空间配置（使用1:1比例）
const REGION_3D_MAPPINGS: Record<string, Region3DMapping> = {
  china: {
    id: 'china',
    name: '中国全图',
    realCoords: { lat: 35.8617, lng: 104.1954 },
    zoom: 4,
    virtualCenter: { x: 0, y: 0, z: 0 },
    virtualSize: { width: 6000000, depth: 6000000 }, // 约6000km (中国跨度)
    cameraPosition: { x: 3000000, y: 2000000, z: 3000000 },
    bounds: { minLat: 18, maxLat: 54, minLng: 73, maxLng: 135 },
    buildings: [],
  },
  beijing: {
    id: 'beijing',
    name: '北京市',
    realCoords: { lat: 39.9042, lng: 116.4074 },
    zoom: 11,
    virtualCenter: { x: 0, y: 0, z: 0 },
    virtualSize: getCityVirtualSize('beijing'), // 约183km × 165km
    cameraPosition: getCityCameraPosition('beijing'),
    bounds: CITIES_CONFIG.beijing.bounds,
    buildings: [
      // 使用真实的米制坐标（相对于天安门）
      // 这些坐标是通过 latLngToMeters 计算得出的
      { id: 'tiananmen', name: '天安门', type: 'landmark', x: 0, y: 25, z: 0, width: 60, depth: 40, height: 30, color: '#ef4444' },
      { id: 'forbidden_city', name: '故宫', type: 'landmark', x: 0, y: 20, z: 80, width: 100, depth: 80, height: 25, color: '#f59e0b' },
      { id: 'cbd', name: 'CBD', type: 'commercial', x: 6800, y: 50, z: -507, width: 120, depth: 100, height: 80, color: '#3b82f6' },
      { id: 'olympic', name: '奥林匹克', type: 'landmark', x: -1100, y: 30, z: 9800, width: 150, depth: 150, height: 20, color: '#22c55e' },
      { id: 'summer_palace', name: '颐和园', type: 'park', x: -13000, y: 20, z: 10000, width: 120, depth: 100, height: 15, color: '#10b981' },
    ],
  },
  shanghai: {
    id: 'shanghai',
    name: '上海市',
    realCoords: { lat: 31.2304, lng: 121.4737 },
    zoom: 11,
    virtualCenter: { x: 0, y: 0, z: 0 },
    virtualSize: getCityVirtualSize('shanghai'), // 约153km × 131km
    cameraPosition: getCityCameraPosition('shanghai'),
    bounds: CITIES_CONFIG.shanghai.bounds,
    buildings: [
      { id: 'lujiazui', name: '陆家嘴', type: 'commercial', x: 0, y: 80, z: 0, width: 80, depth: 60, height: 120, color: '#8b5cf6' },
      { id: 'the_bund', name: '外滩', type: 'landmark', x: -600, y: 20, z: 400, width: 100, depth: 30, height: 25, color: '#f59e0b' },
      { id: 'nanjing_road', name: '南京路', type: 'commercial', x: -100, y: 15, z: 0, width: 80, depth: 150, height: 20, color: '#ec4899' },
      { id: 'disney', name: '迪士尼', type: 'entertainment', x: -25000, y: 25, z: -15000, width: 120, depth: 120, height: 35, color: '#f472b6' },
    ],
  },
  guangzhou: {
    id: 'guangzhou',
    name: '广州市',
    realCoords: { lat: 23.1291, lng: 113.2644 },
    zoom: 11,
    virtualCenter: { x: 0, y: 0, z: 0 },
    virtualSize: getCityVirtualSize('guangzhou'), // 约135km × 150km
    cameraPosition: getCityCameraPosition('guangzhou'),
    bounds: CITIES_CONFIG.guangzhou.bounds,
    buildings: [
      { id: 'cantontower', name: '广州塔', type: 'landmark', x: 0, y: 100, z: 0, width: 30, depth: 30, height: 150, color: '#ef4444' },
      { id: 'pearl', name: '珠江新城', type: 'commercial', x: -500, y: 60, z: 500, width: 100, depth: 100, height: 80, color: '#3b82f6' },
      { id: 'beijing_road', name: '北京路', type: 'commercial', x: 100, y: 15, z: 0, width: 60, depth: 120, height: 20, color: '#f59e0b' },
    ],
  },
  shenzhen: {
    id: 'shenzhen',
    name: '深圳市',
    realCoords: { lat: 22.5431, lng: 114.0579 },
    zoom: 11,
    virtualCenter: { x: 0, y: 0, z: 0 },
    virtualSize: getCityVirtualSize('shenzhen'), // 约76km × 45km
    cameraPosition: getCityCameraPosition('shenzhen'),
    bounds: CITIES_CONFIG.shenzhen.bounds,
    buildings: [
      { id: 'ping_an', name: '平安大厦', type: 'commercial', x: 0, y: 80, z: 0, width: 50, depth: 50, height: 120, color: '#3b82f6' },
      { id: 'civic_center', name: '市民中心', type: 'landmark', x: 500, y: 40, z: 500, width: 120, depth: 100, height: 30, color: '#06b6d4' },
      { id: 'high_tech', name: '高新园', type: 'office', x: -10000, y: 50, z: -5000, width: 150, depth: 100, height: 60, color: '#8b5cf6' },
    ],
  },
  hangzhou: {
    id: 'hangzhou',
    name: '杭州市',
    realCoords: { lat: 30.2741, lng: 120.1551 },
    zoom: 11,
    virtualCenter: { x: 0, y: 0, z: 0 },
    virtualSize: getCityVirtualSize('hangzhou'), // 约234km × 121km
    cameraPosition: getCityCameraPosition('hangzhou'),
    bounds: CITIES_CONFIG.hangzhou.bounds,
    buildings: [
      { id: 'west_lake', name: '西湖', type: 'park', x: 0, y: 10, z: 0, width: 200, depth: 150, height: 10, color: '#06b6d4' },
      { id: 'ali_park', name: '阿里园区', type: 'office', x: 15000, y: 40, z: -10000, width: 100, depth: 80, height: 50, color: '#f97316' },
    ],
  },
  chengdu: {
    id: 'chengdu',
    name: '成都市',
    realCoords: { lat: 30.5728, lng: 104.0668 },
    zoom: 11,
    virtualCenter: { x: 0, y: 0, z: 0 },
    virtualSize: getCityVirtualSize('chengdu'), // 约132km × 156km
    cameraPosition: getCityCameraPosition('chengdu'),
    bounds: CITIES_CONFIG.chengdu.bounds,
    buildings: [
      { id: 'chunxi_road', name: '春熙路', type: 'commercial', x: 0, y: 15, z: 0, width: 80, depth: 100, height: 25, color: '#ec4899' },
      { id: 'tianfu_square', name: '天府广场', type: 'landmark', x: 50, y: 20, z: 50, width: 100, depth: 100, height: 15, color: '#f59e0b' },
      { id: 'dufu_thatched', name: '杜甫草堂', type: 'park', x: -10000, y: 10, z: 5000, width: 120, depth: 80, height: 12, color: '#22c55e' },
    ],
  },
  xian: {
    id: 'xian',
    name: '西安市',
    realCoords: { lat: 34.3416, lng: 108.9398 },
    zoom: 11,
    virtualCenter: { x: 0, y: 0, z: 0 },
    virtualSize: getCityVirtualSize('xian'), // 约180km × 198km
    cameraPosition: getCityCameraPosition('xian'),
    bounds: CITIES_CONFIG.xian.bounds,
    buildings: [
      { id: 'bell_tower', name: '钟楼', type: 'landmark', x: 0, y: 30, z: 0, width: 40, depth: 40, height: 35, color: '#f59e0b' },
      { id: 'big_wild_goose', name: '大雁塔', type: 'landmark', x: 8000, y: 50, z: 10000, width: 40, depth: 40, height: 60, color: '#ef4444' },
      { id: 'city_wall', name: '明城墙', type: 'landmark', x: -5000, y: 15, z: -5000, width: 150, depth: 100, height: 12, color: '#9ca3af' },
    ],
  },
};

interface Map3DLinkedProps {
  onRegionChange?: (regionId: string, regionName: string) => void;
}

export function Map3DLinked({ onRegionChange }: Map3DLinkedProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const agentMarkersRef = useRef<L.Marker[]>([]);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const threeContainerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<any>(null);
  const agentMeshesRef = useRef<THREE.Mesh[]>([]);
  const groundRef = useRef<THREE.Mesh | null>(null);
  const gridRef = useRef<THREE.GridHelper | null>(null);

  const [currentRegion, setCurrentRegion] = useState<Region3DMapping | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [threeReady, setThreeReady] = useState(false);
  const [viewMode, setViewMode] = useState<'map' | '3d' | 'split'>('split');
  const [isSyncing, setIsSyncing] = useState(false);
  const [allAgents, setAllAgents] = useState<AgentData[]>([]);
  const [filteredAgents, setFilteredAgents] = useState<AgentData[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentData | null>(null);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);

  // 心情颜色映射
  const moodColors: Record<string, string> = {
    happy: '#fbbf24',
    focused: '#3b82f6',
    relaxed: '#22c55e',
    neutral: '#9ca3af',
    sad: '#6366f1',
    excited: '#ef4444',
  };

  // 获取所有Agent
  const fetchAllAgents = async () => {
    try {
      const response = await fetch(`${API_BASE}/agents/geographic`);
      const data = await response.json();
      setAllAgents(data.agents || []);
      return data.agents || [];
    } catch (error) {
      console.error('获取Agent数据失败:', error);
      return [];
    }
  };

  // 根据城市边界过滤Agent
  const filterAgentsByRegion = (agents: AgentData[], region: Region3DMapping): AgentData[] => {
    if (!region.bounds) return agents;
    return agents.filter(agent => {
      if (!agent.latitude || !agent.longitude) return false;
      return (
        agent.latitude >= region.bounds!.minLat &&
        agent.latitude <= region.bounds!.maxLat &&
        agent.longitude >= region.bounds!.minLng &&
        agent.longitude <= region.bounds!.maxLng
      );
    });
  };

  // 将地理坐标映射到3D虚拟坐标（1:1比例）
  const mapGeoToVirtual = (lat: number, lng: number, region: Region3DMapping): VirtualCoordinates => {
    if (!region.bounds) return { x: 0, y: 10, z: 0 };

    // 使用统一的坐标转换工具（1:1比例，1单位=1米）
    const meters = latLngToMeters(lat, lng, region.realCoords.lat, region.realCoords.lng);

    return {
      x: meters.x + region.virtualCenter.x,
      y: 10, // Agent高度
      z: meters.z + region.virtualCenter.z,
    };
  };

  // 更新地图上的Agent标记
  const updateMapAgents = (agents: AgentData[]) => {
    if (!mapRef.current) return;

    // 清除旧标记
    agentMarkersRef.current.forEach(marker => mapRef.current!.removeLayer(marker));
    agentMarkersRef.current = [];

    agents.forEach(agent => {
      if (agent.latitude && agent.longitude) {
        const color = moodColors[agent.mood] || '#9ca3af';

        const customIcon = L.divIcon({
          className: 'agent-marker',
          html: `<div style="
            width: 24px;
            height: 24px;
            background: ${color};
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: bold;
            color: white;
          ">${agent.agent_name.charAt(0)}</div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        const marker = L.marker([agent.latitude, agent.longitude], { icon: customIcon })
          .addTo(mapRef.current)
          .bindPopup(`
            <div style="min-width: 200px;">
              <h3 style="margin: 0 0 8px 0; font-size: 16px;">${agent.agent_name}</h3>
              <p style="margin: 4px 0;"><strong>状态:</strong> ${agent.status}</p>
              <p style="margin: 4px 0;"><strong>能量:</strong> ${agent.energy}%</p>
              <p style="margin: 4px 0;"><strong>心情:</strong> ${agent.mood}</p>
              <p style="margin: 4px 0;"><strong>城市:</strong> ${agent.city || '未知'}</p>
              ${agent.address ? `<p style="margin: 4px 0;"><strong>地址:</strong> ${agent.address}</p>` : ''}
            </div>
          `);

        marker.on('click', () => setSelectedAgent(agent));
        agentMarkersRef.current.push(marker);
      }
    });
  };

  // 更新3D场景中的Agent
  const update3DAgents = (agents: AgentData[], region: Region3DMapping) => {
    if (!sceneRef.current) return;

    // 清除旧的Agent网格
    agentMeshesRef.current.forEach(mesh => sceneRef.current!.remove(mesh));
    agentMeshesRef.current = [];

    agents.forEach((agent, index) => {
      if (agent.latitude && agent.longitude) {
        const virtualPos = mapGeoToVirtual(agent.latitude, agent.longitude, region);

        // 创建Agent表示（球体）
        const geometry = new THREE.SphereGeometry(5, 16, 16);
        const colorHex = moodColors[agent.mood] || '#9ca3af';
        const color = new THREE.Color(colorHex);

        const material = new THREE.MeshStandardMaterial({
          color: color,
          emissive: color,
          emissiveIntensity: 0.3,
          metalness: 0.3,
          roughness: 0.4
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(virtualPos.x, virtualPos.y, virtualPos.z);
        mesh.castShadow = true;
        mesh.userData = { agent, isAgent: true };

        sceneRef.current.add(mesh);
        agentMeshesRef.current.push(mesh);
      }
    });
  };

  // 刷新Agent数据
  const refreshAgents = async () => {
    setIsLoadingAgents(true);
    const agents = await fetchAllAgents();
    if (currentRegion) {
      const filtered = filterAgentsByRegion(agents, currentRegion);
      setFilteredAgents(filtered);
      updateMapAgents(filtered);
      update3DAgents(filtered, currentRegion);
    }
    setIsLoadingAgents(false);
  };

  // 初始化真实地图
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [35.8617, 104.1954],
      zoom: 4,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(map);

    mapRef.current = map;
    setMapReady(true);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // 初始化3D场景
  useEffect(() => {
    if (!threeContainerRef.current || sceneRef.current) return;

    // 创建场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    sceneRef.current = scene;

    // 创建相机（使用合理的far值）
    const camera = new THREE.PerspectiveCamera(
      60,
      threeContainerRef.current.clientWidth / threeContainerRef.current.clientHeight,
      1,      // 近裁剪面设为1米
      100000  // 远裁剪面设为100km（足够显示大型城市）
    );
    camera.position.set(500, 400, 500);
    cameraRef.current = camera;

    // 创建渲染器
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(threeContainerRef.current.clientWidth, threeContainerRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.autoUpdate = false; // 优化性能
    threeContainerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 创建控制器
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 50000; // 限制最大距离为50km
    controlsRef.current = controls;

    // 添加灯光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 200, 100);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // 添加地面（使用合理的初始尺寸）
    const initialGroundSize = 10000; // 10km初始尺寸
    const groundGeometry = new THREE.PlaneGeometry(initialGroundSize, initialGroundSize);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x90EE90 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    scene.add(ground);
    groundRef.current = ground;

    // 添加网格
    const gridDivisions = 50; // 每200米一条线
    const gridHelper = new THREE.GridHelper(initialGroundSize, gridDivisions, 0x888888, 0xaaaaaa);
    scene.add(gridHelper);
    gridRef.current = gridHelper;

    setThreeReady(true);

    // 动画循环
    const animate = () => {
      requestAnimationFrame(animate);
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }

      // Agent浮动动画
      const time = Date.now() * 0.001;
      agentMeshesRef.current.forEach((mesh, i) => {
        mesh.position.y = 10 + Math.sin(time + i * 0.5) * 2;
      });
    };
    animate();

    // 初始化中国全图
    setCurrentRegion(REGION_3D_MAPPINGS.china);

    return () => {
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, []);

  // 加载Agent数据
  useEffect(() => {
    const loadAgents = async () => {
      const agents = await fetchAllAgents();
      setAllAgents(agents);
    };
    loadAgents();

    // 定期刷新Agent数据（每30秒）
    const interval = setInterval(() => {
      loadAgents();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // 3D场景点击交互 - 选择Agent
  useEffect(() => {
    if (!threeContainerRef.current || !rendererRef.current) return;

    const handleClick = (event: MouseEvent) => {
      const rect = rendererRef.current!.domElement.getBoundingClientRect();
      const mouse = {
        x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
        y: -((event.clientY - rect.top) / rect.height) * 2 + 1
      };

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, cameraRef.current!);

      const intersects = raycaster.intersectObjects(agentMeshesRef.current);
      if (intersects.length > 0) {
        const clickedMesh = intersects[0].object as THREE.Mesh;
        const agent = clickedMesh.userData.agent as AgentData;
        if (agent) {
          setSelectedAgent(agent);
        }
      }
    };

    rendererRef.current.domElement.addEventListener('click', handleClick);

    return () => {
      if (rendererRef.current) {
        rendererRef.current.domElement.removeEventListener('click', handleClick);
      }
    };
  }, [threeReady]);

  // 更新3D场景中的建筑
  useEffect(() => {
    if (!threeReady || !currentRegion || !sceneRef.current) return;

    const scene = sceneRef.current;

    // 移除旧建筑
    const buildingsToRemove: THREE.Object3D[] = [];
    scene.traverse((object) => {
      if (object.userData.isBuilding) {
        buildingsToRemove.push(object);
      }
    });
    buildingsToRemove.forEach(obj => scene.remove(obj));

    // 动态更新地面尺寸以适应城市大小（限制最大尺寸避免渲染问题）
    const rawSize = Math.max(currentRegion.virtualSize.width, currentRegion.virtualSize.depth);
    const groundSize = Math.min(rawSize, 50000); // 限制最大50km
    if (groundRef.current) {
      scene.remove(groundRef.current);
      const newGroundGeometry = new THREE.PlaneGeometry(groundSize, groundSize);
      const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x90EE90 });
      const ground = new THREE.Mesh(newGroundGeometry, groundMaterial);
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = 0;
      ground.receiveShadow = true;
      scene.add(ground);
      groundRef.current = ground;

      console.log(`[Map3DLinked] Updated ground size: ${groundSize.toFixed(0)}m (raw: ${rawSize.toFixed(0)}m)`);
    }

    // 动态更新网格尺寸和密度
    if (gridRef.current) {
      scene.remove(gridRef.current);
      const gridDivisions = Math.max(40, Math.min(100, Math.floor(groundSize / 500))); // 每500米一条线
      const gridHelper = new THREE.GridHelper(groundSize, gridDivisions, 0x888888, 0xaaaaaa);
      scene.add(gridHelper);
      gridRef.current = gridHelper;
    }

    // 添加新建筑
    currentRegion.buildings.forEach(building => {
      const geometry = new THREE.BoxGeometry(
        building.width,
        building.height,
        building.depth
      );
      const material = new THREE.MeshStandardMaterial({ color: building.color });
      const mesh = new THREE.Mesh(geometry, material);

      mesh.position.set(building.x, building.y + building.height / 2, building.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.isBuilding = true;
      mesh.userData.buildingId = building.id;

      scene.add(mesh);

      // 添加建筑名称标签
      if (viewMode === '3d' || viewMode === 'split') {
        // 可以在这里添加3D文字标签
      }
    });

    // 更新相机位置
    if (cameraRef.current && controlsRef.current) {
      const targetPos = currentRegion.cameraPosition;

      // 平滑移动相机
      const startPos = cameraRef.current.position.clone();
      const endPos = new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z);

      let progress = 0;
      const animateCamera = () => {
        progress += 0.05;
        if (progress >= 1) {
          cameraRef.current.position.copy(endPos);
          controlsRef.current.target.set(0, 0, 0);
          return;
        }

        cameraRef.current.position.lerpVectors(startPos, endPos, progress);
        requestAnimationFrame(animateCamera);
      };
      animateCamera();
    }

    // 触发区域变化回调
    if (onRegionChange) {
      onRegionChange(currentRegion.id, currentRegion.name);
    }

    setIsSyncing(false);
  }, [currentRegion, threeReady, viewMode, onRegionChange]);

  // 切换到指定区域
  const switchRegion = async (regionId: string, regionName: string) => {
    setIsSyncing(true);

    try {
      // 获取地图视图
      const response = await fetch(`${API_BASE}/map/view?region_id=${regionId}`);
      const data = await response.json();

      if (data.success && data.view && mapRef.current) {
        const { center, zoom } = data.view;

        // 更新真实地图
        mapRef.current.flyTo([center.lat, center.lng], zoom, {
          duration: 1.5
        });

        // 添加/更新标记
        const marker = L.marker([center.lat, center.lng])
          .bindPopup(`<b>${regionName}</b>`)
          .addTo(mapRef.current);
      }

      // 更新3D场景
      const region3D = REGION_3D_MAPPINGS[regionId];
      if (region3D) {
        setCurrentRegion(region3D);

        // 过滤并更新Agent显示
        const filtered = filterAgentsByRegion(allAgents, region3D);
        setFilteredAgents(filtered);
        updateMapAgents(filtered);
        update3DAgents(filtered, region3D);
      }
    } catch (error) {
      console.error('切换区域失败:', error);
      setIsSyncing(false);
    }
  };

  // 加载子地区
  const loadChildren = async (parentId: string) => {
    try {
      const response = await fetch(`${API_BASE}/map/regions/${parentId}/children`);
      const data = await response.json();
      return data.success ? data.children : [];
    } catch (error) {
      console.error('加载子地区失败:', error);
      return [];
    }
  };

  return (
    <div className="w-full h-full bg-gradient-to-br from-purple-50 to-blue-50">
      {/* 顶部控制栏 */}
      <div className="bg-white shadow-lg p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-purple-600" />
            真实地图 + 3D虚拟空间 联动系统
          </h1>
          {currentRegion && (
            <div className="flex items-center gap-2 bg-purple-100 px-4 py-2 rounded-lg">
              <span className="font-medium text-purple-700">{currentRegion.name}</span>
              {isSyncing && <span className="text-purple-500 text-sm">同步中...</span>}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-blue-100 px-3 py-2 rounded-lg">
            <Users className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-blue-700">{filteredAgents.length} Agents</span>
          </div>
          <button
            onClick={refreshAgents}
            disabled={isLoadingAgents}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              isLoadingAgents
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingAgents ? 'animate-spin' : ''}`} />
            刷新
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'map'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <Layers className="w-4 h-4 inline mr-1" />
            地图
          </button>
          <button
            onClick={() => setViewMode('3d')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === '3d'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <Cube className="w-4 h-4 inline mr-1" />
            3D
          </button>
          <button
            onClick={() => setViewMode('split')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'split'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <Sync className="w-4 h-4 inline mr-1" />
            分屏
          </button>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex" style={{ height: 'calc(100vh - 80px)' }}>
        {/* 左侧：真实地图 */}
        {(viewMode === 'map' || viewMode === 'split') && (
          <div className={`${viewMode === 'split' ? 'w-1/2' : 'w-2/3'} p-4`}>
            <div className="bg-white rounded-xl shadow-lg p-4 h-full flex flex-col">
              <h2 className="text-lg font-semibold mb-4 text-gray-700">🗺️ 真实世界地图 - Agent位置</h2>
              <div ref={mapContainerRef} className="w-full rounded-lg" style={{ height: viewMode === 'split' ? '400px' : '500px' }} />

              {/* 城市快速选择 */}
              <div className="mt-4 grid grid-cols-4 gap-2">
                {Object.entries(REGION_3D_MAPPINGS).map(([id, region]) => (
                  id !== 'china' && (
                    <button
                      key={id}
                      onClick={() => switchRegion(id, region.name)}
                      className="px-3 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all text-sm font-medium"
                    >
                      {region.name}
                    </button>
                  )
                ))}
              </div>

              {/* Agent列表 */}
              <div className="mt-4 flex-1 overflow-hidden">
                <h3 className="text-sm font-medium text-gray-600 mb-2">当前区域Agent列表</h3>
                <div className="max-h-32 overflow-y-auto text-sm grid grid-cols-2 gap-1">
                  {filteredAgents.length > 0 ? (
                    filteredAgents.map(agent => (
                      <div
                        key={agent.agent_id}
                        onClick={() => setSelectedAgent(agent)}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-100 ${
                          selectedAgent?.agent_id === agent.agent_id ? 'bg-purple-100' : ''
                        }`}
                      >
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: moodColors[agent.mood] || '#9ca3af' }}
                        />
                        <span className="truncate flex-1">{agent.agent_name}</span>
                        <span className="text-xs text-gray-500">{agent.mood}</span>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 text-center text-gray-400 py-4">
                      暂无Agent数据
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Agent详情面板 */}
        {(viewMode === 'map' || viewMode === 'split') && (
          <div className="w-1/6 p-4">
            <div className="bg-white rounded-xl shadow-lg p-4 h-full">
              <h3 className="text-sm font-semibold mb-3 text-gray-700">Agent详情</h3>
              {selectedAgent ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: moodColors[selectedAgent.mood] || '#9ca3af' }}
                    >
                      {selectedAgent.agent_name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{selectedAgent.agent_name}</p>
                      <p className="text-xs text-gray-500">{selectedAgent.status}</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">能量</span>
                      <span className="font-medium">{selectedAgent.energy}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-green-500"
                        style={{ width: `${selectedAgent.energy}%` }}
                      />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">心情</span>
                      <span className="font-medium">{selectedAgent.mood}</span>
                    </div>
                    {selectedAgent.city && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">城市</span>
                        <span className="font-medium">{selectedAgent.city}</span>
                      </div>
                    )}
                    {selectedAgent.address && (
                      <div>
                        <span className="text-gray-500">地址</span>
                        <p className="text-xs mt-1">{selectedAgent.address}</p>
                      </div>
                    )}
                  </div>
                  {selectedAgent.latitude && selectedAgent.longitude && (
                    <button
                      onClick={() => {
                        if (mapRef.current) {
                          mapRef.current.flyTo([selectedAgent.latitude!, selectedAgent.longitude!], 15);
                        }
                      }}
                      className="w-full px-3 py-2 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600"
                    >
                      在地图上查看
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-8">
                  点击Agent查看详情
                </p>
              )}
            </div>
          </div>
        )}

        {/* 右侧：3D虚拟空间 */}
        {(viewMode === '3d' || viewMode === 'split') && (
          <div className={`${viewMode === 'split' ? 'w-1/2' : 'w-full'} p-4`}>
            <div className="bg-white rounded-xl shadow-lg p-4 h-full">
              <h2 className="text-lg font-semibold mb-4 text-gray-700">🏗️ 3D虚拟空间 - Agent可视化</h2>
              <div ref={threeContainerRef} className="w-full rounded-lg" style={{ height: viewMode === 'split' ? '400px' : '500px' }} />

              {/* 3D场景信息 */}
              <div className="mt-4 text-sm text-gray-600">
                {currentRegion ? (
                  <div className="grid grid-cols-2 gap-2">
                    <p><strong>当前区域:</strong> {currentRegion.name}</p>
                    <p><strong>建筑数量:</strong> {currentRegion.buildings.length} 个</p>
                    <p><strong>Agent数量:</strong> {filteredAgents.length} 个</p>
                    <p><strong>虚拟范围:</strong> {currentRegion.virtualSize.width}x{currentRegion.virtualSize.depth}</p>
                  </div>
                ) : (
                  <p>加载中...</p>
                )}
              </div>

              {/* 3D场景说明 */}
              <div className="mt-3 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
                <p className="font-medium mb-1">🎮 3D操作说明:</p>
                <ul className="space-y-1">
                  <li>• 左键拖动: 旋转视角</li>
                  <li>• 右键拖动: 平移视角</li>
                  <li>• 滚轮滚动: 缩放</li>
                  <li>• 点击Agent球体: 查看详情</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
