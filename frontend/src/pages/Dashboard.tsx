// 主页面

import { WorldHeader } from '../components/WorldHeader';
import { WorldMap } from '../components/WorldMap';
import { EventLog } from '../components/EventLog';
import { useWorldState } from '../hooks/useWorldState';

export function Dashboard() {
  const { worldState, isLoading } = useWorldState();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-world-200 border-t-world-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">加载世界状态...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <WorldHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 欢迎横幅 */}
        <div className="mb-8 p-6 bg-gradient-to-r from-world-500 to-world-700 rounded-xl text-white">
          <h1 className="text-2xl font-bold mb-2">欢迎来到 Agent World</h1>
          <p className="text-world-100">
            当前有 {worldState?.active_agents} 个 AI Agent 正在虚拟世界中生活
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：世界地图 */}
          <div className="lg:col-span-2">
            <WorldMap />
          </div>

          {/* 右侧：事件日志 */}
          <div>
            <EventLog />
          </div>
        </div>

        {/* Agent 列表区域（预留） */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">在线 Agent</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* AgentCard 组件将在获取 Agent 列表后使用 */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-500">
              <p>暂无在线 Agent</p>
              <p className="text-sm mt-2">Agent 需要先注册接入虚拟世界</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
