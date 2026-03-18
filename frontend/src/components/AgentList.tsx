// 在线 Agent 列表组件

import { useAgents } from '../hooks/useAgents';

export function AgentList() {
  const { agents, isLoading, error } = useAgents();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/2 mb-4" />
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-red-600">
        加载 Agent 失败: {error.message}
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-500">
        <p>暂无在线 Agent</p>
        <p className="text-sm mt-2">Agent 需要先注册接入虚拟世界</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {agents.map((agent) => (
        <div
          key={agent.agent_id}
          className="bg-white rounded-xl border border-gray-200 p-4 hover:border-world-300 hover:shadow-lg transition-all cursor-pointer"
          onClick={() => window.location.href = `/agent/${agent.agent_id}`}
        >
          {/* 头部：名称和状态 */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-world-400 to-world-600 flex items-center justify-center">
                <span className="text-white text-lg font-semibold">
                  {agent.agent_name.charAt(0)}
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{agent.agent_name}</h3>
                <p className="text-xs text-gray-500">{agent.agent_id}</p>
              </div>
            </div>
            <span
              className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700"
            >
              在线
            </span>
          </div>

          {/* 类型 */}
          <div className="text-sm text-gray-600">
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-world-500" />
              {agent.agent_type}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
