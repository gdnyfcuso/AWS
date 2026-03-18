// 事件日志组件

import { Bell, Clock } from 'lucide-react';
import { useState } from 'react';

interface Event {
  id: string;
  type: string;
  message: string;
  timestamp: Date;
}

const mockEvents: Event[] = [
  {
    id: '1',
    type: 'agent_action',
    message: 'Agent-001 执行了 "工作" 行动，获得 200 金币',
    timestamp: new Date(Date.now() - 1000 * 60 * 2),
  },
  {
    id: '2',
    type: 'agent_action',
    message: 'Agent-002 从 阳光公寓 移动到 科技园区写字楼',
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
  },
  {
    id: '3',
    type: 'social',
    message: 'Agent-001 与 Agent-002 进行了社交互动',
    timestamp: new Date(Date.now() - 1000 * 60 * 10),
  },
  {
    id: '4',
    type: 'world',
    message: '天气从 晴天 变为 多云',
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
  },
];

const eventColors = {
  agent_action: 'border-world-300 bg-world-50',
  social: 'border-purple-300 bg-purple-50',
  world: 'border-gray-300 bg-gray-50',
};

export function EventLog() {
  const [events] = useState<Event[]>(mockEvents);

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000 / 60);

    if (diff < 1) return '刚刚';
    if (diff < 60) return `${diff} 分钟前`;
    if (diff < 1440) return `${Math.floor(diff / 60)} 小时前`;
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">事件日志</h2>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Bell className="w-4 h-4" />
          <span>{events.length} 条事件</span>
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {events.map((event) => (
          <div
            key={event.id}
            className={cn(
              'flex gap-3 p-3 rounded-lg border-l-4',
              eventColors[event.type as keyof typeof eventColors] || 'border-gray-300 bg-gray-50'
            )}
          >
            <div className="flex-shrink-0 mt-0.5">
              <Clock className="w-4 h-4 text-gray-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900">{event.message}</p>
              <p className="text-xs text-gray-500 mt-1">{formatTime(event.timestamp)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
