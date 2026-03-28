// 地区选择器组件 - 支持国家/城市/村庄层级切换

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, MapPin, Search, Globe, Building2, Home, Trees } from 'lucide-react';
import { cn } from '../utils/cn';
import { RegionConfig, RegionType } from '../types/map';
import { useRegionChildren, useCities } from '../hooks/useMapRegions';

interface RegionSelectorProps {
  selectedRegionId: string | null;
  onRegionSelect: (regionId: string, region: RegionConfig) => void;
  className?: string;
}

const regionTypeIcons: Record<RegionType, { icon: any; color: string; label: string }> = {
  country: { icon: Globe, color: 'text-blue-600', label: '国家' },
  province: { icon: MapPin, color: 'text-purple-600', label: '省份' },
  city: { icon: Building2, color: 'text-green-600', label: '城市' },
  district: { icon: MapPin, color: 'text-orange-600', label: '区县' },
  village: { icon: Home, color: 'text-pink-600', label: '社区/地标' },
};

export function RegionSelector({ selectedRegionId, onRegionSelect, className }: RegionSelectorProps) {
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set(['china']));
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<RegionConfig[]>([]);

  // 获取城市列表
  const { cities } = useCities();

  // 获取展开区域的子区域
  const expandedRegionsList = Array.from(expandedRegions);
  const childrenQueries = expandedRegionsList.map(regionId => ({
    regionId,
    ...useRegionChildren(regionId),
  }));

  // 构建树形数据结构
  const buildRegionTree = (): RegionConfig[] => {
    if (searchQuery) {
      return searchResults;
    }

    // 返回中国的直接子区域（主要城市）
    return cities;
  };

  const toggleExpand = (regionId: string) => {
    setExpandedRegions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(regionId)) {
        newSet.delete(regionId);
      } else {
        newSet.add(regionId);
      }
      return newSet;
    });
  };

  const handleRegionClick = (region: RegionConfig) => {
    onRegionSelect(region.id, region);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (query.trim()) {
      // 从API搜索
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1';
        const response = await fetch(`${API_BASE}/map/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        if (data.success) {
          setSearchResults(data.results);
        }
      } catch (error) {
        console.error('Search failed:', error);
      }
    } else {
      setSearchResults([]);
    }
  };

  const renderRegion = (region: RegionConfig, level: number = 0): React.ReactNode => {
    const hasChildren = region.has_children;
    const isExpanded = expandedRegions.has(region.id);
    const isSelected = selectedRegionId === region.id;
    const iconData = regionTypeIcons[region.type];
    const Icon = iconData.icon;

    // 获取子区域
    const childrenData = childrenQueries.find(q => q.regionId === region.id);
    const children = childrenData?.children || [];

    return (
      <div key={region.id} className={cn(level > 0 && 'ml-4')}>
        <div
          className={cn(
            'flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all',
            'hover:bg-gray-100',
            isSelected && 'bg-world-100 hover:bg-world-200 border border-world-300'
          )}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(region.id);
              }}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-6" />}

          <div className={cn('p-1 rounded', iconData.color.replace('text-', 'bg-').replace('-600', '-100'))}>
            <Icon className={cn('w-4 h-4', iconData.color)} />
          </div>

          <div
            className="flex-1 min-w-0"
            onClick={() => handleRegionClick(region)}
          >
            <div className={cn('text-sm font-medium truncate', isSelected ? 'text-world-700' : 'text-gray-900')}>
              {region.name}
            </div>
            {region.name_en && (
              <div className="text-xs text-gray-500 truncate">{region.name_en}</div>
            )}
          </div>

          {region.description && (
            <div className="text-xs text-gray-400 truncate max-w-32" title={region.description}>
              {region.description}
            </div>
          )}
        </div>

        {isExpanded && hasChildren && children.length > 0 && (
          <div className="mt-1">
            {children.map(child => renderRegion(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn('bg-white rounded-xl border border-gray-200', className)}>
      {/* 头部 */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">地区选择</h3>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Globe className="w-3 h-3" />
            <span>中国地图</span>
          </div>
        </div>

        {/* 搜索框 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索城市、区县、地标..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className={cn(
              'w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200',
              'focus:outline-none focus:ring-2 focus:ring-world-500 focus:border-transparent',
              'text-sm placeholder-gray-400'
            )}
          />
        </div>
      </div>

      {/* 地区列表 */}
      <div className="p-4 max-h-96 overflow-y-auto">
        {searchQuery && searchResults.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Search className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>没有找到匹配的地区</p>
          </div>
        )}

        {!searchQuery && buildRegionTree().length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <MapPin className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>正在加载地区数据...</p>
          </div>
        )}

        <div className="space-y-1">
          {buildRegionTree().map(region => renderRegion(region))}
        </div>
      </div>

      {/* 底部提示 */}
      <div className="p-3 border-t border-gray-100 bg-gray-50 rounded-b-xl">
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-blue-100" />
            <span>城市</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-orange-100" />
            <span>区县</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-pink-100" />
            <span>社区</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 简化的地区选择器 - 用于快速切换城市
 */
interface QuickCitySelectorProps {
  selectedRegionId: string | null;
  onRegionSelect: (regionId: string, region: RegionConfig) => void;
  className?: string;
}

export function QuickCitySelector({ selectedRegionId, onRegionSelect, className }: QuickCitySelectorProps) {
  const { cities, loading } = useCities();

  console.log('[QuickCitySelector] Render:', { selectedRegionId, citiesCount: cities.length, loading });

  if (loading) {
    return (
      <div className={cn('bg-white rounded-xl border border-gray-200 p-4', className)}>
        <p className="text-sm text-gray-500">加载中...</p>
      </div>
    );
  }

  return (
    <div className={cn('bg-white rounded-xl border border-gray-200', className)}>
      <h3 className="text-sm font-semibold text-gray-900 mb-3 px-4 pt-4">快速切换城市</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 p-4">
        {cities.map(city => {
          const isSelected = selectedRegionId === city.id;
          return (
            <button
              key={city.id}
              onClick={() => {
                console.log('[QuickCitySelector] City clicked:', city.id, city.name);
                onRegionSelect(city.id, city);
              }}
              className={cn(
                'flex flex-col items-center p-3 rounded-lg border-2 transition-all',
                'hover:shadow-md',
                isSelected
                  ? 'border-world-500 bg-world-50'
                  : 'border-gray-200 hover:border-world-300'
              )}
            >
              <Building2 className={cn('w-5 h-5 mb-1', isSelected ? 'text-world-600' : 'text-gray-500')} />
              <span className={cn('text-sm font-medium', isSelected ? 'text-world-700' : 'text-gray-900')}>
                {city.name}
              </span>
              {city.name_en && (
                <span className="text-xs text-gray-500">{city.name_en}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
