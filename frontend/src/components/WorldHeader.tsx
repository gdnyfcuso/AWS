// 世界状态头部组件

import { Clock, Cloud, Calendar, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { useWorldState } from '../hooks/useWorldState';
import { cn } from '../utils/cn';
import { useState, useEffect } from 'react';
import { useMobileDetection } from '../hooks/useMobileDetection';

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
  const mobile = useMobileDetection();
  const [realTime, setRealTime] = useState(new Date());
  const [showFullInfo, setShowFullInfo] = useState(!mobile.isMobile);

  // 每秒更新真实时间
  useEffect(() => {
    const timer = setInterval(() => {
      setRealTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 格式化真实时间
  const formatRealTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  // 格式化真实日期
  const formatRealDate = (date: Date) => {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

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
        <div className={cn(
          "flex items-center justify-between",
          mobile.isMobile ? "h-14" : "h-16"
        )}>
          {/* Logo */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className={cn(
              "rounded-xl bg-gradient-to-br from-world-500 to-world-700 flex items-center justify-center",
              mobile.isMobile ? "w-8 h-8" : "w-10 h-10"
            )}>
              <span className={cn(
                "text-white",
                mobile.isMobile ? "text-base" : "text-xl"
              )}>🌍</span>
            </div>
            <div>
              <h1 className={cn(
                "font-bold text-gray-900",
                mobile.isMobile ? "text-sm" : "text-xl"
              )}>Agent World</h1>
              {!mobile.isMobile && (
                <p className="text-xs text-gray-500">AI Agent 虚拟世界</p>
              )}
            </div>
          </div>

          {/* 世界状态 */}
          <div className="flex items-center gap-2 sm:gap-4">
            {mobile.isMobile ? (
              // 移动端简化显示
              <>
                {/* 天气 */}
                <div
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded-lg',
                    `bg-gradient-to-r ${weather.bg}`
                  )}
                >
                  <span className="text-base">{weather.icon}</span>
                  {!showFullInfo && (
                    <span className="text-xs font-medium text-white">{weather.label}</span>
                  )}
                </div>

                {/* 在线 Agent */}
                <div className="flex items-center gap-1 px-2 py-1 bg-world-100 rounded-lg">
                  <Users className="w-3 h-3 text-world-600" />
                  <span className="text-xs font-medium text-world-700">{worldState.active_agents}</span>
                </div>

                {/* 展开/折叠按钮 */}
                <button
                  onClick={() => setShowFullInfo(!showFullInfo)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label={showFullInfo ? "收起信息" : "展开信息"}
                >
                  {showFullInfo ? (
                    <ChevronUp className="w-4 h-4 text-gray-600" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-600" />
                  )}
                </button>
              </>
            ) : (
              // 桌面端完整显示
              <>
                {/* 真实时间 */}
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3 text-blue-600" />
                    <span className="text-xs font-medium text-blue-600">真实时间</span>
                  </div>
                  <div className="text-xs font-mono text-gray-700">
                    {formatRealTime(realTime)}
                  </div>
                </div>

                <div className="w-px h-8 bg-gray-200" />

                {/* 虚拟世界时间 */}
                <div className="flex flex-col items-start">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3 text-world-600" />
                    <span className="text-xs font-medium text-world-600">虚拟时间</span>
                  </div>
                  <div className="text-xs font-mono text-gray-700">
                    {worldState.time}
                  </div>
                </div>

                <div className="w-px h-8 bg-gray-200" />

                {/* 虚拟日期 */}
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
              </>
            )}
          </div>
        </div>

        {/* 移动端展开的详细信息 */}
        {mobile.isMobile && showFullInfo && (
          <div className="pb-3 border-t border-gray-100 pt-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="flex items-center gap-1 text-blue-600 mb-1">
                  <Clock className="w-3 h-3" />
                  <span className="font-medium">真实时间</span>
                </div>
                <div className="font-mono text-gray-700">{formatRealTime(realTime)}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="flex items-center gap-1 text-world-600 mb-1">
                  <Clock className="w-3 h-3" />
                  <span className="font-medium">虚拟时间</span>
                </div>
                <div className="font-mono text-gray-700">{worldState.time}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="flex items-center gap-1 text-gray-600 mb-1">
                  <Calendar className="w-3 h-3" />
                  <span className="font-medium">虚拟日期</span>
                </div>
                <div className="text-gray-700">{worldState.date}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="flex items-center gap-1 text-gray-600 mb-1">
                  <Cloud className="w-3 h-3" />
                  <span className="font-medium">季节</span>
                </div>
                <div className="text-gray-700">{season}季</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
