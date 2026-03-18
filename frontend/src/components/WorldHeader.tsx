// 世界状态头部组件

import { Clock, Cloud, Calendar, Users } from 'lucide-react';
import { useWorldState } from '../hooks/useWorldState';
import { cn } from '../utils/cn';

const weatherMap = {
  sunny: { label: '晴天', icon: '☀️', bg: 'from-yellow-400 to-orange-400' },
  cloudy: { label: '多云', icon: '☁️', bg: 'from-gray-400 to-gray-500' },
  rainy: { label: '下雨', icon: '🌧️', bg: 'from-blue-400 to-blue-600' },
  snowy: { label: '下雪', icon: '❄️', bg: 'from-white to-gray-200' },
};

const seasonMap = {
  spring: '春',
  summer: '夏',
  autumn: '秋',
  winter: '冬',
};

export function WorldHeader() {
  const { worldState, isLoading } = useWorldState();

  if (isLoading || !worldState) {
    return (
      <div className="h-16 bg-gray-100 animate-pulse" />
    );
  }

  const weather = weatherMap[worldState.weather];
  const season = seasonMap[worldState.season];

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-world-500 to-world-700 flex items-center justify-center">
              <span className="text-white text-xl">🌍</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Agent World</h1>
              <p className="text-xs text-gray-500">AI Agent 虚拟世界</p>
            </div>
          </div>

          {/* 世界状态 */}
          <div className="flex items-center gap-6">
            {/* 时间 */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
              <Clock className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">{worldState.time}</span>
            </div>

            {/* 日期 */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
              <Calendar className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">{worldState.date}</span>
            </div>

            {/* 天气 */}
            <div
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg',
                `bg-gradient-to-r ${weather.bg}`
              )}
            >
              <span className="text-lg">{weather.icon}</span>
              <span className="text-sm font-medium text-white">{weather.label}</span>
              <span className="text-xs text-white/80">{season}季</span>
            </div>

            {/* 在线 Agent */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-world-100 rounded-lg">
              <Users className="w-4 h-4 text-world-600" />
              <span className="text-sm font-medium text-world-700">{worldState.active_agents}</span>
              <span className="text-xs text-world-500">在线</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
