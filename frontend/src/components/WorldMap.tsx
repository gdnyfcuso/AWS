// 世界地图组件

import { Building2, Home, Briefcase, Trees, Film } from 'lucide-react';
import { cn } from '../utils/cn';

const locationIcons = {
  residential: { icon: Home, color: 'text-green-600', bg: 'bg-green-100' },
  commercial: { icon: Building2, color: 'text-blue-600', bg: 'bg-blue-100' },
  office: { icon: Briefcase, color: 'text-purple-600', bg: 'bg-purple-100' },
  park: { icon: Trees, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  entertainment: { icon: Film, color: 'text-pink-600', bg: 'bg-pink-100' },
};

const locationNames = {
  residential: '住宅区',
  commercial: '商业区',
  office: '办公区',
  park: '公园',
  entertainment: '娱乐区',
};

interface WorldMapProps {
  locations?: Array<{
    id: string;
    name: string;
    type: string;
    agents_present: number;
  }>;
}

export function WorldMap({ locations = [] }: WorldMapProps) {
  // 按类型分组位置
  const locationsByType = locations.reduce((acc, loc) => {
    if (!acc[loc.type]) {
      acc[loc.type] = [];
    }
    acc[loc.type].push(loc);
    return acc;
  }, {} as Record<string, typeof locations>);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">世界地图</h2>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {Object.entries(locationIcons).map(([type, { icon: Icon, color, bg }]) => {
          const typeLocations = locationsByType[type] || [];
          const totalAgents = typeLocations.reduce((sum, loc) => sum + loc.agents_present, 0);

          return (
            <div
              key={type}
              className={cn(
                'flex flex-col items-center p-4 rounded-xl border-2 border-dashed border-gray-200',
                'hover:border-world-300 hover:bg-world-50/50 transition-all cursor-pointer'
              )}
            >
              <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mb-2', bg)}>
                <Icon className={cn('w-6 h-6', color)} />
              </div>
              <h3 className="text-sm font-medium text-gray-900 mb-1">
                {locationNames[type as keyof typeof locationNames]}
              </h3>
              <p className="text-xs text-gray-500">{typeLocations.length} 个地点</p>
              <div className="mt-2 flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-world-500" />
                <span className="text-xs font-medium text-world-600">{totalAgents} 人</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 地点列表 */}
      <div className="mt-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">所有地点</h3>
        <div className="space-y-2">
          {locations.map((location) => {
            const iconData = locationIcons[location.type as keyof typeof locationIcons] || locationIcons.residential;
            const Icon = iconData.icon;

            return (
              <div
                key={location.id}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', iconData.bg)}>
                    <Icon className={cn('w-4 h-4', iconData.color)} />
                  </div>
                  <span className="text-sm font-medium text-gray-900">{location.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-world-500" />
                  <span className="text-sm text-gray-600">{location.agents_present}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
