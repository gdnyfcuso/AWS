// Agent 详情页面

import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Activity } from 'lucide-react';
import { useAgent } from '../hooks/useAgents';
import { AgentCard } from '../components/AgentCard';

export function AgentDetail() {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const { agent, isLoading, error } = useAgent(agentId!);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-world-200 border-t-world-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Agent not found</p>
          <button
            onClick={() => navigate('/')}
            className="text-world-600 hover:text-world-700"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部导航 */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>返回</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：Agent 信息 */}
          <div className="lg:col-span-1">
            <AgentCard agent={agent} />
          </div>

          {/* 右侧：详细信息和活动 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 基本信息 */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">基本信息</h2>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-gray-500">Agent ID</dt>
                  <dd className="text-sm font-medium text-gray-900">{agent.agent_id}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">类型</dt>
                  <dd className="text-sm font-medium text-gray-900">{agent.agent_type}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">状态</dt>
                  <dd className="text-sm font-medium text-gray-900">{agent.status}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">位置</dt>
                  <dd className="text-sm font-medium text-gray-900">{agent.location.name}</dd>
                </div>
              </dl>
            </div>

            {/* 社交关系 */}
            {agent.relationships.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">社交关系</h2>
                <div className="space-y-3">
                  {agent.relationships.map((rel) => (
                    <div
                      key={rel.agent_id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{rel.name}</p>
                        <p className="text-sm text-gray-500">{rel.relationship_level}</p>
                      </div>
                      <div className="text-sm text-gray-600">
                        {rel.interactions_count} 次互动
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 活动历史 */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                活动历史
              </h2>
              <div className="space-y-3">
                {agent.recent_activities.map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="w-2 h-2 mt-2 rounded-full bg-world-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                      <p className="text-sm text-gray-600">{activity.result}</p>
                      <p className="text-xs text-gray-500 mt-1">{activity.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
