// 增强版真实世界地图 - 支持地区切换

import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, ZoomIn, ZoomOut, Globe, Layers } from 'lucide-react';
import { RegionSelector, QuickCitySelector } from './RegionSelector';
import { RegionConfig } from '../types/map';
import { fetchMapView } from '../hooks/useMapRegions';
import { cn } from '../utils/cn';

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

interface EnhancedRealWorldMapProps {
  agents: AgentMarker[];
  onAgentClick?: (agentId: string) => void;
  className?: string;
  showRegionSelector?: boolean;
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

export function EnhancedRealWorldMap({
  agents,
  onAgentClick,
  className,
  showRegionSelector = true
}: EnhancedRealWorldMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // 地区选择状态
  const [selectedRegion, setSelectedRegion] = useState<RegionConfig | null>(null);
  const [showRegionPanel, setShowRegionPanel] = useState(false);
  const [mapView, setMapView] = useState<{ center: { lat: number; lng: number }; zoom: number }>({
    center: { lat: 39.9042, lng: 116.4074 }, // 默认北京
    zoom: 10,
  });

  // 初始化地图
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const container = mapContainerRef.current;

    setTimeout(() => {
      if (!mapRef.current && container.offsetWidth > 0) {
        try {
          const map = L.map(container, {
            center: [mapView.center.lat, mapView.center.lng],
            zoom: mapView.zoom,
            zoomControl: true,
          });

          // 天地图矢量图层
          const vecLayer = L.tileLayer('https://t0.tianditu.gov.cn/DataServer?T=vec_w&x={x}&y={y}&l={z}', {
            attribution: '&copy; 天地图',
            maxZoom: 18,
          });

          // 天地图注记图层
          const cvaLayer = L.tileLayer('https://t0.tianditu.gov.cn/DataServer?T=cva_w&x={x}&y={y}&l={z}', {
            attribution: '&copy; 天地图',
            maxZoom: 18,
          });

          vecLayer.addTo(map);
          cvaLayer.addTo(map);

          mapRef.current = map;
          setMapReady(true);

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

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // 当地图视图改变时更新地图中心
  useEffect(() => {
    if (mapRef.current && mapReady) {
      mapRef.current.setView([mapView.center.lat, mapView.center.lng], mapView.zoom, {
        animate: true,
        duration: 1,
      });
    }
  }, [mapView, mapReady]);

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
          if (onAgentClick) {
            onAgentClick(agent.agent_id);
          }
        });
      });

  }, [agents, mapReady, onAgentClick]);

  // 地图控制
  const zoomIn = () => mapRef.current?.zoomIn();
  const zoomOut = () => mapRef.current?.zoomOut();

  const handleRegionSelect = useCallback(async (regionId: string, region: RegionConfig) => {
    setSelectedRegion(region);

    // 获取地图视图配置
    try {
      const view = await fetchMapView(regionId);
      if (view) {
        setMapView({
          center: view.center,
          zoom: view.zoom,
        });
      }
    } catch (error) {
      console.error('Failed to fetch map view:', error);
      // 使用默认视图
      setMapView({
        center: region.coordinates,
        zoom: region.zoom || 10,
      });
    }
  }, []);

  const centerOnAgents = () => {
    if (mapRef.current) {
      const agentsWithCoords = agents.filter(a => a.lat !== null && a.lng !== null);
      if (agentsWithCoords.length > 0) {
        const bounds = L.latLngBounds(agentsWithCoords.map(a => [a.lat!, a.lng!]));
        mapRef.current.fitBounds(bounds, { padding: [20, 20] });
      }
    }
  };

  return (
    <div className={cn('flex gap-4', className)}>
      {/* 地图主体 */}
      <div className="flex-1 bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900">真实世界地图</h2>
              {selectedRegion && (
                <>
                  <span className="text-gray-400">/</span>
                  <span className="text-sm text-world-600 font-medium">{selectedRegion.name}</span>
                </>
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
            {showRegionSelector && (
              <button
                onClick={() => setShowRegionPanel(!showRegionPanel)}
                className={cn(
                  'flex items-center gap-1 px-3 py-2 rounded-lg transition-colors',
                  showRegionPanel
                    ? 'bg-world-100 text-world-700'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                )}
                title="切换地区"
              >
                <Globe className="w-4 h-4" />
                <span className="text-sm">地区</span>
              </button>
            )}
            <button onClick={zoomIn} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors" title="放大">
              <ZoomIn className="w-4 h-4 text-gray-600" />
            </button>
            <button onClick={zoomOut} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors" title="缩小">
              <ZoomOut className="w-4 h-4 text-gray-600" />
            </button>
            <button onClick={centerOnAgents} className="p-2 bg-world-100 hover:bg-world-200 rounded-lg transition-colors" title="居中显示">
              <MapPin className="w-4 h-4 text-world-600" />
            </button>
          </div>
        </div>

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
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Agent 列表</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
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
      </div>

      {/* 地区选择面板 */}
      {showRegionSelector && showRegionPanel && (
        <div className="w-80 flex-shrink-0">
          <QuickCitySelector
            selectedRegionId={selectedRegion?.id || null}
            onRegionSelect={handleRegionSelect}
          />
        </div>
      )}
    </div>
  );
}
