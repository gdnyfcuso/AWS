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

  // 3D虚拟空间数据 - 使用城市级地形加载
  // 优先使用选中 Agent 的城市，如果没有选中则使用第一个 Agent
  const terrainAgentId = selectedAgentId || geographicAgents[0]?.agent_id || null;
  const { data: cityTerrainData, loading: cityTerrainLoading } = useCityTerrainByAgent(terrainAgentId, {
    enabled: !!terrainAgentId,
    refreshInterval: 30000,
  });

  // 回退到默认地形数据
  const { data: defaultTerrainData } = useTerrainData(!cityTerrainData.city && !cityTerrainLoading);

  // 使用城市地形数据，如果没有则使用默认地形数据
  const terrainData = cityTerrainData.city ? {
    mountains: cityTerrainData.mountains,
    hills: cityTerrainData.hills,
    rivers: cityTerrainData.rivers,
    plains: cityTerrainData.plains,
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

  // 获取 3D 虚拟空间的建筑数据
  const virtualBuildings = (locations || []).map((loc, index) => {
    // 使用位置坐标，转换 2D 地图坐标到 3D 世界坐标
    const coords = loc.coordinates || { x: 0, y: 0, z: 0 };
    const angle = (index / ((locations?.length || 1) || 1)) * Math.PI * 2;
    const radius = 80;

    return {
      id: loc.id,
      name: loc.name,
      type: loc.type,
      x: coords.x || Math.cos(angle) * radius,
      y: 0,
      z: coords.y || Math.sin(angle) * radius,  // 地图 y 轴对应 3D z 轴
      width: 30,
      depth: 30,
      height: 40 + Math.random() * 60,
      color: loc.type === 'residential' ? '#4ade80' :
             loc.type === 'office' ? '#60a5fa' :
             loc.type === 'commercial' ? '#fbbf24' :
             loc.type === 'park' ? '#34d399' : '#a78bfa',
    };
  });

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
              />
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-6 text-center" style={{ minHeight: '500px' }}>
                <p className="text-gray-500">暂无地理位置数据，请注册 Agent 时提供位置信息</p>
              </div>
            )
          )}

          {viewMode === 'virtual-3d' && (
            <>
              {/* 当前城市信息显示 - 仅在非全屏时显示 */}
              {cityTerrainData.city && !is3DFullscreen && (
                <div className="absolute top-4 left-4 z-10 bg-black/60 text-white px-4 py-2 rounded-lg backdrop-blur-sm">
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
                  {cityTerrainLoading && (
                    <div className="mt-1 text-xs text-gray-400">加载地形数据...</div>
                  )}
                </div>
              )}
              <VirtualSpace3D
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
                roads={roadNetworkData.roads}
                intersections={roadNetworkData.intersections}
                vehicles={vehicles}
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
