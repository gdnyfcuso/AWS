// 真实世界地图组件 - 使用 Leaflet
// 增强版：支持地区层级切换，联动3D虚拟空间

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, ZoomIn, ZoomOut, Layers, Users } from 'lucide-react';
import { QuickCitySelector } from './RegionSelector';
import { fetchMapView, RegionConfig } from '../hooks/useMapRegions';

interface AgentMarker {
  agent_id: string;
  agent_name: string;
  lat: number | null;
  lng: number | null;
  energy: number;
  mood: string;
  status: string;
  last_seen: string;
}

interface RealWorldMapProps {
  agents: AgentMarker[];
  onAgentClick?: (agentId: string) => void;
  onRegionChange?: (regionId: string, region: RegionConfig) => void;
  selectedRegionId?: string | null;
}

const moodColors: Record<string, string> = {
  happy: '#22c55e',
  sad: '#3b82f6',
  angry: '#ef4444',
  neutral: '#6b7280',
  focused: '#8b5cf6',
  relaxed: '#06b6d4',
};

const moodLabels: Record<string, string> = {
  happy: '开心',
  sad: '悲伤',
  angry: '愤怒',
  neutral: '平静',
  focused: '专注',
  relaxed: '放松',
};

export function RealWorldMap({ agents, onAgentClick, onRegionChange, selectedRegionId }: RealWorldMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [showRegionSelector, setShowRegionSelector] = useState(true);
  const [currentRegion, setCurrentRegion] = useState<RegionConfig | null>(null);
  const [viewMode, setViewMode] = useState<'agents' | 'region'>('agents'); // agents=跟随agent, region=锁定在选中地区

  console.log('[RealWorldMap] Render:', { showRegionSelector, selectedRegionId, currentRegion, viewMode });

  // 初始化地图
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const container = mapContainerRef.current;

    // 确保容器有尺寸
    setTimeout(() => {
      if (!mapRef.current && container.offsetWidth > 0) {
        try {
          // 创建地图
          const map = L.map(container, {
            center: [39.9042, 116.4074], // 北京
            zoom: 12,
            zoomControl: true,
          });

          // 使用多个瓦片源，提高加载成功率
          const tileLayers = [
            // 天地图（国内）
            'https://t0.tianditu.gov.cn/DataServer?T=vec_w&x={x}&y={y}&l={z}',
            // OpenStreetMap（备用）
            'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            // CartoDB（备用）
            'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
          ];

          let tileLoaded = false;
          tileLayers.forEach(url => {
            if (!tileLoaded) {
              L.tileLayer(url, {
                attribution: '&copy; 地图数据',
                maxZoom: 18,
                errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/5+HgAHggJ/DchM7Kg==',
              }).on('load', () => {
                if (!tileLoaded) {
                  tileLoaded = true;
                  console.log('Map tiles loaded from:', url);
                  setMapError(null);
                }
              }).on('tileerror', () => {
                console.warn('Failed to load tiles from:', url);
              }).addTo(map);
            }
          });

          // 如果所有瓦片都加载失败，显示错误
          setTimeout(() => {
            if (!tileLoaded) {
              setMapError('地图瓦片加载失败，请检查网络连接');
            }
          }, 10000);

          mapRef.current = map;
          setMapReady(true);

          // 强制更新地图大小
          setTimeout(() => {
            map.invalidateSize();
          }, 200);

          console.log('Map initialized successfully');

        } catch (error) {
          console.error('Failed to initialize map:', error);
          setMapError('地图初始化失败: ' + error);
        }
      }
    }, 100);

    // 清理
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // 处理地区切换 - 更新地图视图并锁定视角
  useEffect(() => {
    const updateMapView = async () => {
      if (!selectedRegionId || !mapRef.current || !mapReady) return;

      try {
        const viewConfig = await fetchMapView(selectedRegionId);
        if (viewConfig) {
          const { center, zoom } = viewConfig;
          console.log('[RealWorldMap] Flying to region and locking view:', selectedRegionId, center, zoom);
          mapRef.current.flyTo([center.lat, center.lng], zoom, {
            duration: 1.5,
          });
          // 锁定视角到选中的地区，关闭自动跟随 Agent
          setViewMode('region');
        }
      } catch (error) {
        console.error('Failed to update map view:', error);
      }
    };

    updateMapView();
  }, [selectedRegionId, mapReady]);

  // 处理地区选择回调
  const handleRegionSelect = (regionId: string, region: RegionConfig) => {
    console.log('[RealWorldMap] Region selected:', regionId, region);
    setCurrentRegion(region);
    if (onRegionChange) {
      console.log('[RealWorldMap] Calling onRegionChange callback');
      onRegionChange(regionId, region);
    }
  };

  // 添加 Agent 标记
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    const map = mapRef.current;

    // 移除旧的标记图层
    map.eachLayer((layer: any) => {
      if (layer instanceof L.CircleMarker) {
        map.removeLayer(layer);
      }
    });

    // 添加新的标记
    agents
      .filter(agent => agent.lat !== null && agent.lng !== null)
      .forEach(agent => {
        const color = moodColors[agent.mood] || '#6b7280';
        const size = agent.status === 'online' ? 15 : 12;

        const marker = L.circleMarker([agent.lat!, agent.lng!], {
          radius: size,
          fillColor: color,
          color: '#ffffff',
          weight: 3,
          opacity: 1,
          fillOpacity: 0.8,
        }).addTo(map);

        // 绑定弹窗
        const popupContent = `
          <div style="min-width: 180px; font-family: system-ui;">
            <div style="font-weight: bold; font-size: 14px; margin-bottom: 6px; color: #111827;">
              ${agent.agent_name}
            </div>
            <div style="font-size: 11px; color: #6b7280; margin-bottom: 4px;">
              状态: <span style="color: ${agent.status === 'online' ? '#22c55e' : '#9ca3af'}; font-weight: ${agent.status === 'online' ? '600' : '400'};">
                ${agent.status === 'online' ? '在线' : '离线'}
              </span>
            </div>
            <div style="font-size: 11px; color: #6b7280; margin-bottom: 4px;">
              心情: ${moodLabels[agent.mood] || '未知'}
            </div>
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
              <span style="font-size: 11px; color: #6b7280;">能量:</span>
              <div style="flex: 1; height: 6px; background: #e5e7eb; border-radius: 3px;">
                <div style="height: 100%; background: ${agent.energy > 50 ? '#22c55e' : agent.energy > 20 ? '#f59e0b' : '#ef4444'}; width: ${agent.energy}%; border-radius: 2px;"></div>
              </div>
              <span style="font-size: 11px; color: #6b7280;">${agent.energy}%</span>
            </div>
            <div style="font-size: 10px; color: #9ca3af;">
              ${agent.lat!.toFixed(4)}, ${agent.lng!.toFixed(4)}
            </div>
          </div>
        `;

        marker.bindPopup(popupContent);

        // 点击事件
        marker.on('click', () => {
          setSelectedAgent(agent.agent_id);
          // 点击 Agent 时，切换回自动跟随模式
          setViewMode('agents');
          console.log('[RealWorldMap] Agent clicked, switching to agents view mode');
          if (onAgentClick) {
            onAgentClick(agent.agent_id);
          }
        });
      });

    // 只有在 viewMode='agents' 时才自动调整地图视角到包含所有 Agent 的区域
    const agentsWithCoords = agents.filter(a => a.lat !== null && a.lng !== null);
    if (agentsWithCoords.length > 0 && mapRef.current && viewMode === 'agents') {
      const bounds = L.latLngBounds(agentsWithCoords.map(a => [a.lat!, a.lng!]));
      map.fitBounds(bounds, { padding: [20, 20] });
    }

  }, [agents, mapReady, onAgentClick, viewMode]);

  // 地图控制
  const zoomIn = () => mapRef.current?.zoomIn();
  const zoomOut = () => mapRef.current?.zoomOut();
  const resetView = () => {
    if (mapRef.current) {
      mapRef.current.setView([39.9042, 116.4074], 12);
    }
  };
  const centerOnAgents = () => {
    console.log('[RealWorldMap] Center on agents clicked, switching to agents view mode');
    setViewMode('agents');
    if (mapRef.current) {
      const agentsWithCoords = agents.filter(a => a.lat !== null && a.lng !== null);
      if (agentsWithCoords.length > 0) {
        const bounds = L.latLngBounds(agentsWithCoords.map(a => [a.lat!, a.lng!]));
        mapRef.current.fitBounds(bounds, { padding: [20, 20] });
      }
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">真实世界地图</h2>
            {currentRegion && (
              <span className="text-sm text-world-600 bg-world-100 px-2 py-1 rounded">
                {currentRegion.name}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {agents.length} 个 Agent 分布在世界各地
          </p>
          {mapError && (
            <p className="text-xs text-red-500 mt-1">⚠️ {mapError}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* 视图模式指示器 */}
          <div className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            viewMode === 'region'
              ? 'bg-world-100 text-world-700'
              : 'bg-gray-100 text-gray-600'
          }`}>
            {viewMode === 'region' ? (
              <span className="flex items-center gap-1">
                <Layers className="w-3 h-3" />
                城市视图
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                跟随 Agent
              </span>
            )}
          </div>

          <button
            onClick={() => setShowRegionSelector(!showRegionSelector)}
            className={`p-2 rounded-lg transition-colors ${
              showRegionSelector
                ? 'bg-world-100 hover:bg-world-200 text-world-600'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
            }`}
            title="切换地区"
          >
            <Layers className="w-4 h-4" />
          </button>
          <button onClick={zoomIn} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors" title="放大">
            <ZoomIn className="w-4 h-4 text-gray-600" />
          </button>
          <button onClick={zoomOut} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors" title="缩小">
            <ZoomOut className="w-4 h-4 text-gray-600" />
          </button>
          <button onClick={resetView} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors" title="重置视角">
            <Navigation className="w-4 h-4 text-gray-600" />
          </button>
          <button onClick={centerOnAgents} className="p-2 bg-world-100 hover:bg-world-200 rounded-lg transition-colors" title="居中显示">
            <MapPin className="w-4 h-4 text-world-600" />
          </button>
        </div>
      </div>

      {/* 地区选择器 */}
      {showRegionSelector && (
        <div className="mb-4">
          <QuickCitySelector
            selectedRegionId={selectedRegionId || null}
            onRegionSelect={handleRegionSelect}
            className="border border-world-200"
          />
        </div>
      )}

      {/* 地图容器 */}
      <div
        ref={mapContainerRef}
        className="relative w-full rounded-lg border border-gray-200 overflow-hidden bg-blue-50"
        style={{ height: '550px', minHeight: '550px' }}
      >
        {!mapReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <p className="text-gray-600">正在加载地图...</p>
          </div>
        )}
      </div>

      {/* Agent 列表 */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
        {agents
          .filter(agent => agent.lat !== null && agent.lng !== null)
          .map(agent => {
            const moodColor = moodColors[agent.mood] || '#6b7280';
            const lat = agent.lat ?? 0;
            const lng = agent.lng ?? 0;
            return (
              <button
                key={agent.agent_id}
                onClick={() => {
                  if (mapRef.current) {
                    mapRef.current.setView([lat, lng], 15);
                    setSelectedAgent(agent.agent_id);
                  }
                }}
                className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
                  selectedAgent === agent.agent_id
                    ? 'border-world-500 bg-world-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: moodColor }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{agent.agent_name}</div>
                  <div className="text-xs text-gray-500 truncate">
                    {lat.toFixed(2)}, {lng.toFixed(2)}
                  </div>
                </div>
              </button>
            );
          })}
      </div>
    </div>
  );
}
