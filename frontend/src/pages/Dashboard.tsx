// 主页面

import { WorldHeader } from '../components/WorldHeader';
import { AgentWorldMap } from '../components/AgentWorldMap';
import { AgentRelationships } from '../components/AgentRelationships';
import { EventLog } from '../components/EventLog';
import { AgentList } from '../components/AgentList';
import { RealWorldMap } from '../components/RealWorldMap';
import { VirtualSpace3D } from '../components/VirtualSpace3D';
import { ApiGuideLink } from '../components/ApiGuideLink';
import { useWorldState } from '../hooks/useWorldState';
import { useWorldMap } from '../hooks/useWorldMap';
import { useAgentRelationships } from '../hooks/useAgentRelationships';
import { useRealWorldAgents } from '../hooks/useRealWorldAgents';
import { useTerrainData } from '../hooks/useTerrainData';
import { useCityTerrainByAgent } from '../hooks/useCityTerrain';
import { useRoadNetwork } from '../hooks/useRoadNetwork';
import { useVehicles } from '../hooks/useVehicles';
import { useMobileDetection, useResponsiveClasses } from '../hooks/useMobileDetection';
import { RegionConfig } from '../types/map';
import { useRegionLandmarks } from '../hooks/useMapRegions';
import { useCityGeography } from '../hooks/useCityGeography';
import { useEffect, useState } from 'react';
import { Box, Globe, Smartphone } from 'lucide-react';
import { getApiUrl } from '../utils/api';

type MainViewMode = 'realworld-map' | 'virtual-3d';
type CameraViewMode = 'first-person' | 'second-person' | 'third-person';

export function Dashboard() {
  const { worldState, locations, isLoading, error } = useWorldState();
  const { agents, locations: mapLocations, interactions } = useWorldMap();
  const { nodes, edges } = useAgentRelationships();
  const { agents: geographicAgents, isLoading: isLoadingGeo } = useRealWorldAgents();

  // Mobile detection
  const mobile = useMobileDetection();
  const responsive = useResponsiveClasses();

  const [debugInfo, setDebugInfo] = useState('');
  const [viewMode, setViewMode] = useState<MainViewMode>(mobile.isMobile ? 'virtual-3d' : 'realworld-map');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [cameraViewMode, setCameraViewMode] = useState<CameraViewMode>('third-person');
  const [is3DFullscreen, setIs3DFullscreen] = useState(false);

  // 地区选择状态
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<RegionConfig | null>(null);

  // 使用新的城市地理系统获取完整的3D数据
  const { geography: cityGeography, loading: geographyLoading } = useCityGeography(selectedRegionId);

  // 旧的地标数据（向后兼容）
  const { landmarks: regionLandmarks, loading: landmarksLoading } = useRegionLandmarks(selectedRegionId);

  // 3D虚拟空间数据 - 使用城市级地形加载（1:1比例）
  // 优先使用选中 Agent 的城市，如果没有选中则使用第一个 Agent
  const terrainAgentId = selectedAgentId || geographicAgents[0]?.agent_id || null;
  const { data: cityTerrainData, loading: cityTerrainLoading } = useCityTerrainByAgent(terrainAgentId, {
    enabled: !!terrainAgentId,
    refreshInterval: 30000,
  });

  // 回退到默认地形数据
  const { data: defaultTerrainData } = useTerrainData(!cityTerrainData.city && !cityTerrainLoading);

  // 使用城市地形数据，如果没有则使用默认地形数据
  // 注意：只有当城市地形数据实际包含特征时才使用它，否则使用默认地形数据
  const hasCityTerrainFeatures = cityTerrainData.city && (
    (cityTerrainData.mountains && cityTerrainData.mountains.length > 0) ||
    (cityTerrainData.hills && cityTerrainData.hills.length > 0) ||
    (cityTerrainData.rivers && cityTerrainData.rivers.length > 0) ||
    (cityTerrainData.plains && cityTerrainData.plains.length > 0) ||
    (cityTerrainData.waters && cityTerrainData.waters.length > 0)
  );

  const terrainData = hasCityTerrainFeatures ? {
    mountains: cityTerrainData.mountains || [],
    hills: cityTerrainData.hills || [],
    rivers: cityTerrainData.rivers || [],
    plains: cityTerrainData.plains || [],
    waters: cityTerrainData.waters || [],
  } : defaultTerrainData;

  const { data: roadNetworkData } = useRoadNetwork(true);
  const { vehicles } = useVehicles(true);

  // 调试信息
  useEffect(() => {
    setDebugInfo(`Agents: ${agents.length}, Nodes: ${nodes.length}, GeoAgents: ${geographicAgents.length}`);
  }, [agents, nodes, geographicAgents]);

  // 处理地图上的 Agent 点击
  const handleAgentClick = (agentId: string) => {
    console.log('Agent clicked:', agentId);
    setSelectedAgentId(agentId);
    setViewMode('virtual-3d');
  };

  // 处理 3D 视图中的 Agent 点击
  const handleVirtualAgentClick = (agentId: string) => {
    console.log('Virtual agent clicked:', agentId);
    setSelectedAgentId(agentId);
  };

  // 处理地图地区切换 - 联动3D虚拟空间
  const handleRegionChange = (regionId: string, region: RegionConfig) => {
    console.log('[Dashboard] Region changed:', regionId, region);
    setSelectedRegionId(regionId);
    setSelectedRegion(region);

    // 根据选择的地区类型决定行为
    if (region.type === 'city') {
      console.log('[Dashboard] City selected, will load landmarks for:', regionId);
      // 切换到 3D 视图以显示地标
      setViewMode('virtual-3d');
    }
  };

  // 获取 3D 虚拟空间所需的 Agent 数据（使用虚拟世界位置）
  const [virtualAgents, setVirtualAgents] = useState<any[]>([]);

  // 获取虚拟世界位置
  useEffect(() => {
    const fetchVirtualPositions = async () => {
      try {
        const response = await fetch(getApiUrl('/api/v1/agents/virtual-positions'));
        if (response.ok) {
          const data = await response.json();
          setVirtualAgents(data.agents);
        }
      } catch (error) {
        console.error('Failed to fetch virtual positions:', error);
      }
    };

    fetchVirtualPositions();
    // 每 3 秒刷新一次
    const interval = setInterval(fetchVirtualPositions, 3000);
    return () => clearInterval(interval);
  }, []);

  const displayAgents = virtualAgents.length > 0 ? virtualAgents : agents.map(a => ({
    agent_id: a.agent_id,
    agent_name: a.name || a.agent_name,
    x: (Math.random() - 0.5) * 100, // 随机分布在空间中
    y: 0,
    z: (Math.random() - 0.5) * 100,
    energy: a.state?.energy || 50,
    mood: a.state?.mood || 'neutral',
    status: a.status || 'online',
  }));

  // 调试：监控城市地理数据的变化
  useEffect(() => {
    console.log('[Dashboard] City geography updated:', {
      selectedRegionId,
      hasGeography: !!cityGeography,
      city: cityGeography?.city?.name,
      roadsCount: cityGeography?.roads?.length || 0,
      landmarksCount: cityGeography?.landmarks?.length || 0,
      riversCount: cityGeography?.rivers?.length || 0,
      loading: geographyLoading,
    });
  }, [cityGeography, selectedRegionId, geographyLoading]);

  // 获取 3D 虚拟空间的建筑数据
  // 优先使用城市地理数据，否则使用旧的地区数据
  // 检查是否有任何城市数据（地标、道路或河流）
  const useCityData = !!cityGeography && (
    (cityGeography.landmarks && cityGeography.landmarks.length > 0) ||
    (cityGeography.roads && cityGeography.roads.length > 0) ||
    (cityGeography.rivers && cityGeography.rivers.length > 0)
  );

  // 调试日志
  console.log('[Dashboard] useCityData check:', {
    selectedRegionId,
    hasCityGeography: !!cityGeography,
    cityGeographyKeys: cityGeography ? Object.keys(cityGeography) : [],
    hasLandmarks: !!cityGeography?.landmarks,
    landmarksCount: cityGeography?.landmarks?.length || 0,
    hasRoads: !!cityGeography?.roads,
    roadsCount: cityGeography?.roads?.length || 0,
    hasRivers: !!cityGeography?.rivers,
    riversCount: cityGeography?.rivers?.length || 0,
    useCityData,
    geographyLoading,
  });

  const virtualBuildings = [
    // 如果有城市地理数据，使用城市的地标（包含道路信息）
    ...(useCityData ? cityGeography.landmarks.map((lm) => ({
      id: lm.id,
      name: lm.name,
      nameEn: lm.nameEn,
      type: lm.type,
      x: lm.x,
      y: lm.y,
      z: lm.z,
      width: lm.width,
      depth: lm.depth,
      height: lm.height,
      color: lm.color,
      description: lm.description,
    })) : regionLandmarks.map((lm) => ({
      id: lm.id,
      name: lm.name,
      type: lm.type || 'landmark',
      x: lm.x,
      y: lm.y || 0,
      z: lm.z,
      width: lm.width || 30,
      depth: lm.depth || 30,
      height: lm.height || 40,
      color: lm.color || '#a78bfa',
    }))),

    // 仅在没有城市地理数据时添加虚拟世界的位置建筑
    ...(!useCityData ? (locations || []).map((loc, index) => {
      const coords = loc.coordinates || { x: 0, y: 0, z: 0 };
      const angle = (index / ((locations?.length || 1) || 1)) * Math.PI * 2;
      const radius = 80;

      return {
        id: loc.id,
        name: loc.name,
        type: loc.type,
        x: coords.x || Math.cos(angle) * radius,
        y: 0,
        z: coords.y || Math.sin(angle) * radius,
        width: 30,
        depth: 30,
        height: 40 + Math.random() * 60,
        color: loc.type === 'residential' ? '#4ade80' :
               loc.type === 'office' ? '#60a5fa' :
               loc.type === 'commercial' ? '#fbbf24' :
               loc.type === 'park' ? '#34d399' : '#a78bfa',
      };
    }) : []),
  ];

  // 城市道路数据 - 将地理数据中的道路转换为3D场景所需格式
  const cityRoads = useCityData && cityGeography.roads ? cityGeography.roads.map((road: any) => ({
    id: road.id,
    name: road.name,
    nameEn: road.nameEn,
    type: road.type,  // 保留 type 字段
    path: road.path,
    width: road.width / 10,  // 转换为虚拟空间单位
    lanes: road.lanes,
    color: road.type === 'highway' ? '#ef4444' :
            road.type === 'ring_road' ? '#3b82f6' :
            road.type === 'main_road' ? '#10b981' : '#6b7280',
  })) : [];

  // 城市河流数据
  const cityRivers = useCityData && cityGeography.rivers ? cityGeography.rivers.map((river: any) => ({
    id: river.id,
    name: river.name,
    path: river.path,
    width: river.width,
  })) : [];

  // 加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-world-200 border-t-world-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">加载世界状态...</p>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">连接失败</p>
          <p className="text-gray-600 mb-4">请确保后端服务正在运行</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-world-600 text-white rounded-lg hover:bg-world-700"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <WorldHeader />

      <main className={`max-w-7xl mx-auto ${responsive.containerPadding}`}>
        {/* 调试信息 */}
        <div className="mb-4 text-xs text-gray-500">
          {debugInfo}
        </div>

        {/* 欢迎横幅 */}
        <div className={`mb-4 ${responsive.cardPadding} bg-gradient-to-r from-world-500 to-world-700 rounded-xl text-white`}>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <h1 className={`${responsive.pageTitle} font-bold mb-2`}>欢迎来到 Agent World</h1>
                <p className="text-world-100">
                  当前有 {worldState?.active_agents || 0} 个 AI Agent 正在虚拟世界中自主生活
                </p>
              </div>
              {mobile.isMobile && (
                <div className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-2">
                  <Smartphone className="w-4 h-4" />
                  <span className="text-sm">手机模式</span>
                </div>
              )}
            </div>
            {/* API 使用指南链接 */}
            <ApiGuideLink inBanner={true} />
          </div>
        </div>

        {/* 视图模式切换 */}
        <div className={`mb-6 flex items-center ${mobile.isMobile ? 'gap-1' : 'gap-2'} bg-white rounded-xl border border-gray-200 p-2`}>
          <button
            onClick={() => setViewMode('realworld-map')}
            className={`flex items-center ${mobile.isMobile ? 'gap-1 px-2 py-1.5 text-xs' : 'gap-2 px-4 py-2'} rounded-lg transition-all ${
              viewMode === 'realworld-map'
                ? 'bg-world-100 text-world-700 font-medium'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Globe className={mobile.isMobile ? 'w-3 h-3' : 'w-4 h-4'} />
            {!mobile.isMobile && <span>真实世界地图</span>}
            {mobile.isMobile && <span>地图</span>}
          </button>
          <button
            onClick={() => setViewMode('virtual-3d')}
            className={`flex items-center ${mobile.isMobile ? 'gap-1 px-2 py-1.5 text-xs' : 'gap-2 px-4 py-2'} rounded-lg transition-all ${
              viewMode === 'virtual-3d'
                ? 'bg-world-100 text-world-700 font-medium'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Box className={mobile.isMobile ? 'w-3 h-3' : 'w-4 h-4'} />
            {!mobile.isMobile && <span>3D 虚拟空间</span>}
            {mobile.isMobile && <span>3D</span>}
          </button>
        </div>

        {/* 主要视图区域 */}
        <div className="mb-6">
          {viewMode === 'realworld-map' && (
            isLoadingGeo ? (
              <div className="bg-white rounded-xl border border-gray-200 p-6 text-center" style={{ minHeight: '500px' }}>
                <p className="text-gray-500">加载地理数据...</p>
              </div>
            ) : geographicAgents.length > 0 ? (
              <RealWorldMap
                agents={geographicAgents}
                onAgentClick={handleAgentClick}
                onRegionChange={handleRegionChange}
                selectedRegionId={selectedRegionId}
              />
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-6 text-center" style={{ minHeight: '500px' }}>
                <p className="text-gray-500">暂无地理位置数据，请注册 Agent 时提供位置信息</p>
              </div>
            )
          )}

          {viewMode === 'virtual-3d' && (
            <>
              {/* 当前地区信息显示 - 仅在非全屏时显示 */}
              {(selectedRegion || cityTerrainData.city) && !is3DFullscreen && (
                <div className="absolute top-4 left-4 z-10 bg-black/60 text-white px-4 py-2 rounded-lg backdrop-blur-sm">
                  <div className="flex flex-col gap-2">
                    {selectedRegion && (
                      <div className="flex items-center gap-3">
                        <span className="text-sm">
                          <span className="font-medium">{selectedRegion.name}</span>
                          <span className="text-gray-300 text-xs ml-2">({selectedRegion.type})</span>
                        </span>
                        {regionLandmarks.length > 0 && (
                          <span className="text-xs text-gray-300">
                            {regionLandmarks.length} 个地标
                          </span>
                        )}
                      </div>
                    )}
                    {cityTerrainData.city && !selectedRegion && (
                      <div className="flex items-center gap-3">
                        <span className="text-sm">
                          <span className="font-medium">{cityTerrainData.city.name}</span>
                          {cityTerrainData.city.province && <span className="text-gray-300">, {cityTerrainData.city.province}</span>}
                        </span>
                        {selectedAgentId && (
                          <span className="text-xs text-gray-300">
                            (Agent: {selectedAgentId})
                          </span>
                        )}
                      </div>
                    )}
                    {(cityTerrainLoading || landmarksLoading) && (
                      <div className="text-xs text-gray-400">加载中...</div>
                    )}
                  </div>
                </div>
              )}
              {/* 临时调试面板 */}
              <div className="absolute top-20 right-4 z-10 bg-black/80 text-white p-4 rounded-lg text-xs max-w-md space-y-1 overflow-auto max-h-96">
                <div className="font-bold text-yellow-400">🔍 调试信息</div>
                <div>selectedRegionId: <span className="text-green-400">{selectedRegionId || 'null'}</span></div>
                <div>useCityData: <span className="text-yellow-400 font-bold">{useCityData ? 'TRUE' : 'FALSE'}</span></div>
                <div className="border-t border-gray-600 mt-2 pt-2">
                  <div className="text-gray-400">传递给 VirtualSpace3D:</div>
                  <div>roads.length: <span className="text-green-400">{(useCityData ? cityRoads : roadNetworkData.roads)?.length || 0}</span></div>
                  <div>intersections.length: <span className="text-green-400">{(useCityData ? [] : roadNetworkData.intersections)?.length || 0}</span></div>
                  <div>rivers.length: <span className="text-green-400">{cityRivers.length}</span></div>
                  <div>terrainFeatures.length: <span className="text-green-400">{[...terrainData.mountains, ...terrainData.hills, ...terrainData.rivers, ...terrainData.plains].length}</span></div>
                  <div>enableTerrain: <span className="text-green-400">true (1:1 scale)</span></div>
                </div>
                <div className="border-t border-gray-600 mt-2 pt-2">
                  <div className="text-gray-400">cityRoads详情:</div>
                  {cityRoads.map((r, i) => (
                    <div key={i} className="text-blue-300">
                      {r.name}: {r.path?.length || 0} points, type={r.type}, color={r.color}, width={r.width}
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-600 mt-2 pt-2">
                  <div className="text-gray-400">terrainFeatures详情:</div>
                  <div className="text-xs max-h-32 overflow-auto">
                    {[...terrainData.mountains, ...terrainData.hills, ...terrainData.rivers, ...terrainData.plains].map((f, i) => (
                      <div key={i} className="text-purple-300">
                        {f.type}: {f.name || 'unnamed'} pos=({f.position?.x?.toFixed(0)}, {f.position?.z?.toFixed(0)}) size={f.size?.width?.toFixed(0)}x{f.size?.height?.toFixed(0)}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border-t border-gray-600 mt-2 pt-2">
                  <div className="text-gray-400">cityBounds:</div>
                  <div className="text-xs text-yellow-300">
                    {cityGeography?.bounds ? (
                      <>
                        min: ({cityGeography.bounds.min.x?.toFixed(0)}, {cityGeography.bounds.min.y?.toFixed(0)}, {cityGeography.bounds.min.z?.toFixed(0)}) |
                        max: ({cityGeography.bounds.max.x?.toFixed(0)}, {cityGeography.bounds.max.y?.toFixed(0)}, {cityGeography.bounds.max.z?.toFixed(0)})
                      </>
                    ) : 'null'}
                  </div>
                </div>
              </div>
              <VirtualSpace3D
                key={selectedRegionId ? `city-${selectedRegionId}` : 'default'}
                agents={displayAgents}
                buildings={virtualBuildings}
                onAgentClick={handleVirtualAgentClick}
                selectedAgentId={selectedAgentId}
                viewMode={cameraViewMode}
                onViewModeChange={setCameraViewMode}
                terrainFeatures={[
                  ...terrainData.mountains,
                  ...terrainData.hills,
                  ...terrainData.rivers,
                  ...terrainData.plains,
                ]}
                // 当有城市地理数据时，使用城市的道路，清空路口
                roads={useCityData ? cityRoads : roadNetworkData.roads}
                intersections={useCityData ? [] : roadNetworkData.intersections}
                vehicles={vehicles}
                // 新增：城市特定的河流数据
                rivers={cityRivers}
                // 新增：城市边界，用于限制相机视角
                cityBounds={useCityData && cityGeography?.bounds ? {
                  min: { x: cityGeography.bounds.min.x, y: cityGeography.bounds.min.y, z: cityGeography.bounds.min.z },
                  max: { x: cityGeography.bounds.max.x, y: cityGeography.bounds.max.y, z: cityGeography.bounds.max.z },
                } : null}
                // 新增：城市中心，用于初始相机位置
                cityCenter={useCityData ? cityGeography?.city?.center : null}
                // 启用地形渲染（包括城市地形，后端已使用1:1比例生成）
                enableTerrain={true}
                enableRoads={true}
                enableVehicles={true}
                externalIsFullscreen={is3DFullscreen}
                onFullscreenChange={setIs3DFullscreen}
                isMobile={mobile.isMobile}
                isTouchDevice={mobile.isMobile}
              />
            </>
          )}
        </div>

        {/* 可视化地图区域 */}
        <div className={`grid grid-cols-1 ${mobile.isMobile ? '' : 'xl:grid-cols-2'} gap-6 mb-6`}>
          {agents.length > 0 && (locations?.length || 0) > 0 ? (
            <AgentWorldMap agents={agents} locations={mapLocations} interactions={interactions} />
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
              <p className="text-gray-500">加载地图数据中...</p>
            </div>
          )}

          {nodes.length > 0 ? (
            <AgentRelationships agents={nodes} relationships={edges} />
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
              <p className="text-gray-500">加载关系数据中...</p>
            </div>
          )}
        </div>

        <div className={`grid grid-cols-1 ${mobile.isMobile ? '' : 'lg:grid-cols-3'} gap-6`}>
          {/* 左侧：事件日志 */}
          <div className="lg:col-span-2">
            <EventLog />
          </div>

          {/* 右侧：Agent 列表 */}
          <div>
            <div className={`bg-white rounded-xl border border-gray-200 ${responsive.cardPadding}`}>
              <h2 className={`${responsive.sectionTitle} font-semibold text-gray-900 mb-4`}>在线 Agent</h2>
              <AgentList />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
