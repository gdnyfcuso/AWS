// 在线 Agent 列表组件

import { useAgents } from '../hooks/useAgents';
import { useResponsiveClasses } from '../hooks/useMobileDetection';
import { cn } from '../utils/cn';

export function AgentList() {
  const { agents, isLoading, error } = useAgents();
  const responsive = useResponsiveClasses();

  if (isLoading) {
    return (
      <div className="space-y-2 sm:space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className={cn("bg-white rounded-xl border border-gray-200 animate-pulse", responsive.cardPadding)}>
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
      <div className={cn("bg-white rounded-xl border border-gray-200 text-center text-red-600", responsive.cardPadding)}>
        加载 Agent 失败: {error.message}
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className={cn("bg-white rounded-xl border border-gray-200 text-center text-gray-500", responsive.cardPadding)}>
        <p>暂无在线 Agent</p>
        <p className="text-sm mt-2">Agent 需要先注册接入虚拟世界</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 sm:space-y-3">
      {agents.map((agent) => (
        <div
          key={agent.agent_id}
          className={cn(
            "bg-white rounded-xl border border-gray-200 hover:border-world-300 hover:shadow-lg transition-all cursor-pointer",
            responsive.cardPadding
          )}
          onClick={() => window.location.href = `/agent/${agent.agent_id}`}
        >
          {/* 头部：名称和状态 */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={cn(
                "rounded-full bg-gradient-to-br from-world-400 to-world-600 flex items-center justify-center",
                responsive.isMobile ? "w-8 h-8" : "w-10 h-10"
              )}>
                <span className={cn(
                  "text-white font-semibold",
                  responsive.isMobile ? "text-sm" : "text-lg"
                )}>
                  {agent.agent_name.charAt(0)}
                </span>
              </div>
              <div>
                <h3 className={cn("font-semibold text-gray-900", responsive.isMobile ? "text-sm" : "")}>{agent.agent_name}</h3>
                <p className="text-xs text-gray-500 truncate max-w-[120px] sm:max-w-none">{agent.agent_id}</p>
              </div>
            </div>
            <span
              className={cn(
                "px-2 py-1 font-medium rounded-full bg-green-100 text-green-700",
                responsive.isMobile ? "text-xs" : "text-xs"
              )}
            >
              在线
            </span>
          </div>

          {/* 类型 */}
          <div className={cn("text-gray-600", responsive.isMobile ? "text-xs" : "text-sm")}>
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
