// Agent 卡片组件

import { Heart, Zap, Coins, MapPin } from 'lucide-react';
import type { Agent } from '../types';
import { cn } from '../utils/cn';

interface AgentCardProps {
  agent: Agent;
  onClick?: () => void;
}

const moodColors = {
  happy: 'bg-green-100 text-green-700',
  sad: 'bg-blue-100 text-blue-700',
  angry: 'bg-red-100 text-red-700',
  neutral: 'bg-gray-100 text-gray-700',
  focused: 'bg-purple-100 text-purple-700',
  relaxed: 'bg-cyan-100 text-cyan-700',
};

const moodLabels = {
  happy: '开心',
  sad: '悲伤',
  angry: '愤怒',
  neutral: '平静',
  focused: '专注',
  relaxed: '放松',
};

const statusColors = {
  online: 'bg-green-500',
  offline: 'bg-gray-400',
  busy: 'bg-yellow-500',
};

export function AgentCard({ agent, onClick }: AgentCardProps) {
  const moodColor = moodColors[agent.attributes.mood];
  const statusColor = statusColors[agent.status];

  // 计算属性百分比
  const energyPercent = (agent.attributes.energy / 100) * 100;
  const healthPercent = (agent.attributes.health / 100) * 100;

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white rounded-xl border border-gray-200 p-4 cursor-pointer',
        'hover:border-world-300 hover:shadow-lg transition-all'
      )}
    >
      {/* 头部：名称和状态 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-world-400 to-world-600 flex items-center justify-center">
              <span className="text-white text-lg font-semibold">
                {agent.agent_name.charAt(0)}
              </span>
            </div>
            <div
              className={cn(
                'absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white',
                statusColor
              )}
            />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{agent.agent_name}</h3>
            <p className="text-xs text-gray-500">{agent.agent_id}</p>
          </div>
        </div>
        <span
          className={cn(
            'px-2 py-1 text-xs font-medium rounded-full',
            moodColor
          )}
        >
          {moodLabels[agent.attributes.mood]}
        </span>
      </div>

      {/* 位置 */}
      <div className="flex items-center gap-2 mb-3 text-sm text-gray-600">
        <MapPin className="w-4 h-4" />
        <span>{agent.location.name}</span>
      </div>

      {/* 属性条 */}
      <div className="space-y-2">
        {/* 金币 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Coins className="w-4 h-4 text-yellow-500" />
            <span>金币</span>
          </div>
          <span className="font-semibold text-gray-900">
            {agent.attributes.money.toLocaleString()}
          </span>
        </div>

        {/* 能量 */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span>能量</span>
            </div>
            <span className="text-sm font-medium text-gray-900">
              {agent.attributes.energy}%
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full transition-all duration-300',
                energyPercent > 50 ? 'bg-green-500' : energyPercent > 20 ? 'bg-yellow-500' : 'bg-red-500'
              )}
              style={{ width: `${energyPercent}%` }}
            />
          </div>
        </div>

        {/* 健康 */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Heart className="w-4 h-4 text-red-500" />
              <span>健康</span>
            </div>
            <span className="text-sm font-medium text-gray-900">
              {agent.attributes.health}%
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-500 transition-all duration-300"
              style={{ width: `${healthPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 最近活动 */}
      {agent.recent_activities && agent.recent_activities.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-1">最近活动</p>
          <p className="text-sm text-gray-700 truncate">
            {agent.recent_activities[0].action} - {agent.recent_activities[0].result}
          </p>
        </div>
      )}
    </div>
  );
}
