// 主页面

import { WorldHeader } from '../components/WorldHeader';
import { AgentWorldMap } from '../components/AgentWorldMap';
import { AgentRelationships } from '../components/AgentRelationships';
import { EventLog } from '../components/EventLog';
import { AgentList } from '../components/AgentList';
import { RealWorldMap } from '../components/RealWorldMap';
import { VirtualSpace3D } from '../components/VirtualSpace3D';
import { useWorldState } from '../hooks/useWorldState';
import { useWorldMap } from '../hooks/useWorldMap';
import { useAgentRelationships } from '../hooks/useAgentRelationships';
import { useRealWorldAgents } from '../hooks/useRealWorldAgents';
import { useEffect, useState } from 'react';
import { Box, Globe } from 'lucide-react';
import { getApiUrl } from '../utils/api';

type MainViewMode = 'realworld-map' | 'virtual-3d';
type CameraViewMode = 'first-person' | 'second-person' | 'third-person';

export function Dashboard() {
  const { worldState, locations, isLoading, error } = useWorldState();
  const { agents, locations: mapLocations, interactions } = useWorldMap();
  const { nodes, edges } = useAgentRelationships();
  const { agents: geographicAgents, isLoading: isLoadingGeo } = useRealWorldAgents();

  const [debugInfo, setDebugInfo] = useState('');
  const [viewMode, setViewMode] = useState<MainViewMode>('realworld-map');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [cameraViewMode, setCameraViewMode] = useState<CameraViewMode>('third-person');

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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 调试信息 */}
        <div className="mb-4 text-xs text-gray-500">
          {debugInfo}
        </div>

        {/* 欢迎横幅 */}
        <div className="mb-6 p-6 bg-gradient-to-r from-world-500 to-world-700 rounded-xl text-white">
          <h1 className="text-2xl font-bold mb-2">欢迎来到 Agent World</h1>
          <p className="text-world-100">
            当前有 {worldState?.active_agents || 0} 个 AI Agent 正在虚拟世界中自主生活
          </p>
        </div>

        {/* 视图模式切换 */}
        <div className="mb-6 flex items-center gap-2 bg-white rounded-xl border border-gray-200 p-2">
          <button
            onClick={() => setViewMode('realworld-map')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              viewMode === 'realworld-map'
                ? 'bg-world-100 text-world-700 font-medium'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>真实世界地图</span>
          </button>
          <button
            onClick={() => setViewMode('virtual-3d')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              viewMode === 'virtual-3d'
                ? 'bg-world-100 text-world-700 font-medium'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Box className="w-4 h-4" />
            <span>3D 虚拟空间</span>
          </button>
        </div>

        {/* 主要视图区域 */}
        <div className="mb-6">
          {viewMode === 'realworld-map' && (
            isLoadingGeo ? (
              <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
                <p className="text-gray-500">加载地理数据...</p>
              </div>
            ) : geographicAgents.length > 0 ? (
              <RealWorldMap
                agents={geographicAgents}
                onAgentClick={handleAgentClick}
              />
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
                <p className="text-gray-500">暂无地理位置数据，请注册 Agent 时提供位置信息</p>
              </div>
            )
          )}

          {viewMode === 'virtual-3d' && (
            <VirtualSpace3D
              agents={displayAgents}
              buildings={virtualBuildings}
              onAgentClick={handleVirtualAgentClick}
              selectedAgentId={selectedAgentId}
              viewMode={cameraViewMode}
              onViewModeChange={setCameraViewMode}
            />
          )}
        </div>

        {/* 可视化地图区域 */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：事件日志 */}
          <div className="lg:col-span-2">
            <EventLog />
          </div>

          {/* 右侧：Agent 列表 */}
          <div>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">在线 Agent</h2>
              <AgentList />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
