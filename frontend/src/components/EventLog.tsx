// 事件日志组件

import { Bell, Clock, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '../utils/cn';
import { getApiUrl } from '../utils/api';

interface Action {
  id: string;
  agent_id: string;
  agent_name: string;
  action_type: string;
  success: boolean;
  result: {
    message: string;
    action_performed: string;
    new_state?: {
      location?: {
        name: string;
      };
      status?: {
        money: number;
        energy: number;
        mood: string;
      };
    };
  };
  performed_at: string;
}

interface ActionsResponse {
  actions: Action[];
}

const actionColors = {
  work: 'border-green-300 bg-green-50',
  relax: 'border-blue-300 bg-blue-50',
  sleep: 'border-indigo-300 bg-indigo-50',
  go_to_work: 'border-amber-300 bg-amber-50',
  go_home: 'border-orange-300 bg-orange-50',
  socialize: 'border-purple-300 bg-purple-50',
  chat: 'border-pink-300 bg-pink-50',
  move: 'border-teal-300 bg-teal-50',
};

export function EventLog() {
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActions = async () => {
    try {
      const url = getApiUrl('/api/v1/agents/actions/recent?limit=20');
      console.log('Fetching actions from:', url);
      const response = await fetch(url);
      const data: ActionsResponse = await response.json();
      console.log('Actions response:', data);
      setActions(data.actions || []);
    } catch (error) {
      console.error('Failed to fetch actions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActions();
    const interval = setInterval(fetchActions, 10000); // 每10秒刷新一次
    return () => clearInterval(interval);
  }, []);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000 / 60);

    if (diff < 1) return '刚刚';
    if (diff < 60) return `${diff} 分钟前`;
    if (diff < 1440) return `${Math.floor(diff / 60)} 小时前`;
    return date.toLocaleDateString('zh-CN');
  };

  const getActionColor = (actionType: string) => {
    return actionColors[actionType as keyof typeof actionColors] || 'border-gray-300 bg-gray-50';
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Agent 活动日志</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Bell className="w-4 h-4" />
            <span>{actions.length} 条记录</span>
          </div>
          <button
            onClick={fetchActions}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            title="刷新"
          >
            <RefreshCw className={cn('w-4 h-4 text-gray-500', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">加载中...</div>
      ) : actions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">暂无活动记录</div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {actions.map((action) => (
            <div
              key={action.id}
              className={cn(
                'flex gap-3 p-3 rounded-lg border-l-4',
                getActionColor(action.action_type)
              )}
            >
              <div className="flex-shrink-0 mt-0.5">
                <Clock className="w-4 h-4 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm text-gray-900">{action.agent_name}</span>
                  <span className="text-xs text-gray-500">执行了</span>
                  <span className="text-xs font-medium text-world-600">
                    {action.result?.action_performed || action.action_type}
                  </span>
                </div>
                {action.result?.message && (
                  <p className="text-sm text-gray-600">{action.result.message}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">{formatTime(action.performed_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
