// Agent 关系网络组件 - 显示 Agent 之间的关系和互动

import { useEffect, useState, useRef } from 'react';
import { cn } from '../utils/cn';

interface AgentNode {
  agent_id: string;
  agent_name: string;
  energy: number;
  mood: string;
  money: number;
  x: number;
  y: number;
}

interface RelationshipEdge {
  from: string;
  to: string;
  strength: number;
  type: 'friend' | 'stranger' | 'colleague';
  interactions_count: number;
}

interface AgentRelationshipsProps {
  agents: AgentNode[];
  relationships?: RelationshipEdge[];
}

const moodColors = {
  happy: '#22c55e',
  sad: '#3b82f6',
  angry: '#ef4444',
  neutral: '#6b7280',
  focused: '#8b5cf6',
  relaxed: '#06b6d4',
};

const relationshipColors = {
  friend: '#22c55e',
  colleague: '#3b82f6',
  stranger: '#9ca3af',
};

export function AgentRelationships({ agents, relationships = [] }: AgentRelationshipsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [animationFrame, setAnimationFrame] = useState(0);

  // 力导向图布局参数
  const layoutConfig = {
    width: 600,
    height: 400,
    centerX: 300,
    centerY: 200,
    nodeRadius: 25,
  };

  // 动画效果
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationFrame(prev => (prev + 1) % 200);
    }, 30);
    return () => clearInterval(interval);
  }, []);

  // 绘制关系网络
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制背景
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制关系线
    relationships.forEach(rel => {
      const fromAgent = agents.find(a => a.agent_id === rel.from);
      const toAgent = agents.find(a => a.agent_id === rel.to);

      if (fromAgent && toAgent) {
        const x1 = fromAgent.x;
        const y1 = fromAgent.y;
        const x2 = toAgent.x;
        const y2 = toAgent.y;

        // 绘制关系线
        ctx.strokeStyle = relationshipColors[rel.type];
        ctx.lineWidth = Math.max(1, rel.strength * 3);
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // 绘制互动次数标签
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        ctx.fillStyle = '#6b7280';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(rel.interactions_count.toString(), midX, midY);
      }
    });

    // 绘制同一位置的 Agent 之间的连接（基于距离）
    agents.forEach((agent, i) => {
      agents.slice(i + 1).forEach(otherAgent => {
        const distance = Math.sqrt(
          Math.pow(agent.x - otherAgent.x, 2) +
          Math.pow(agent.y - otherAgent.y, 2)
        );

        // 如果距离较近，绘制连接线
        if (distance < 150) {
          ctx.strokeStyle = '#e5e7eb';
          ctx.lineWidth = 1;
          ctx.globalAlpha = 0.5;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(agent.x, agent.y);
          ctx.lineTo(otherAgent.x, otherAgent.y);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.globalAlpha = 1;
        }
      });
    });

    // 绘制 Agent 节点
    agents.forEach(agent => {
      const isSelected = selectedAgent === agent.agent_id;
      const isHovered = hoveredAgent === agent.agent_id;

      // 绘制节点阴影
      ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;

      // 绘制节点背景圆
      const moodColor = moodColors[agent.mood as keyof typeof moodColors] || '#6b7280';
      ctx.fillStyle = moodColor;
      ctx.globalAlpha = 0.2;
      ctx.beginPath();
      ctx.arc(agent.x, agent.y, isSelected ? 35 : 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // 清除阴影
      ctx.shadowColor = 'transparent';

      // 绘制节点边框
      ctx.strokeStyle = moodColor;
      ctx.lineWidth = isSelected ? 4 : 2;
      ctx.stroke();

      // 绘制 Agent 头像圆圈
      ctx.fillStyle = moodColor;
      ctx.beginPath();
      ctx.arc(agent.x, agent.y, isSelected ? 20 : 18, 0, Math.PI * 2);
      ctx.fill();

      // 绘制 Agent 名称首字母
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(agent.agent_name.charAt(0), agent.x, agent.y);

      // 绘制 Agent 名称
      ctx.fillStyle = '#374151';
      ctx.font = isSelected ? 'bold 11px sans-serif' : '10px sans-serif';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(agent.agent_name, agent.x, agent.y + isSelected ? 45 : 42);

      // 绘制能量指示器
      const energyColor = agent.energy > 50 ? '#22c55e' : agent.energy > 20 ? '#f59e0b' : '#ef4444';
      const barWidth = 30;
      const barHeight = 3;
      const barX = agent.x - barWidth / 2;
      const barY = agent.y + isSelected ? 52 : 49;

      ctx.fillStyle = '#e5e7eb';
      ctx.fillRect(barX, barY, barWidth, barHeight);

      ctx.fillStyle = energyColor;
      ctx.fillRect(barX, barY, barWidth * (agent.energy / 100), barHeight);
    });

    // 绘制脉冲动画（选中的 Agent）
    if (selectedAgent) {
      const agent = agents.find(a => a.agent_id === selectedAgent);
      if (agent) {
        const pulseRadius = 30 + Math.sin(animationFrame * 0.1) * 10;
        ctx.strokeStyle = moodColors[agent.mood as keyof typeof moodColors] || '#6b7280';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(agent.x, agent.y, pulseRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

  }, [agents, relationships, selectedAgent, hoveredAgent, animationFrame]);

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // 检查是否点击了 Agent
    let clickedAgent = null;
    agents.forEach(agent => {
      const distance = Math.sqrt(Math.pow(x - agent.x, 2) + Math.pow(y - agent.y, 2));
      if (distance < 25) {
        clickedAgent = agent.agent_id;
      }
    });

    setSelectedAgent(clickedAgent === selectedAgent ? null : clickedAgent || null);
  };

  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    let found = null;
    agents.forEach(agent => {
      const distance = Math.sqrt(Math.pow(x - agent.x, 2) + Math.pow(y - agent.y, 2));
      if (distance < 25) {
        found = agent.agent_id;
      }
    });

    setHoveredAgent(found);
  };

  const displayAgent = agents.find(a => a.agent_id === (hoveredAgent || selectedAgent));

  // 计算选中的 Agent 的关系
  const agentRelationships = selectedAgent
    ? relationships.filter(r => r.from === selectedAgent || r.to === selectedAgent)
    : [];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Agent 关系网络</h2>
          <p className="text-xs text-gray-500 mt-1">可视化 Agent 之间的关系和互动</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full border-2 border-green-500" />
            <span>好友</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full border-2 border-blue-500" />
            <span>同事</span>
          </div>
        </div>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={layoutConfig.width}
          height={layoutConfig.height}
          className="border border-gray-200 rounded-lg cursor-pointer w-full"
          style={{ maxWidth: '100%', height: 'auto' }}
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMouseMove}
          onMouseLeave={() => setHoveredAgent(null)}
        />

        {/* Agent 详情卡片 */}
        {displayAgent && (
          <div className="absolute top-4 right-4 bg-white rounded-lg shadow-xl border border-gray-200 p-4 min-w-48">
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-4 h-4 rounded-full"
                style={{
                  backgroundColor: moodColors[displayAgent.mood as keyof typeof moodColors]
                }}
              />
              <span className="font-bold text-gray-900">{displayAgent.agent_name}</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">能量</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${displayAgent.energy}%`,
                        backgroundColor: displayAgent.energy > 50 ? '#22c55e' : displayAgent.energy > 20 ? '#f59e0b' : '#ef4444'
                      }}
                    />
                  </div>
                  <span className="text-gray-900">{displayAgent.energy}%</span>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">心情</span>
                <span className="font-medium text-gray-900">
                  {displayAgent.mood === 'happy' ? '开心' :
                   displayAgent.mood === 'sad' ? '悲伤' :
                   displayAgent.mood === 'angry' ? '愤怒' :
                   displayAgent.mood === 'focused' ? '专注' :
                   displayAgent.mood === 'relaxed' ? '放松' : '平静'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">金币</span>
                <span className="font-medium text-yellow-600">💰 {displayAgent.money}</span>
              </div>
            </div>

            {/* 关系列表 */}
            {agentRelationships.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="text-xs text-gray-500 mb-2">关系</div>
                <div className="space-y-1">
                  {agentRelationships.map((rel, i) => {
                    const otherAgentId = rel.from === displayAgent.agent_id ? rel.to : rel.from;
                    const otherAgent = agents.find(a => a.agent_id === otherAgentId);
                    return (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-gray-700">{otherAgent?.agent_name}</span>
                        <div className="flex items-center gap-1">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: relationshipColors[rel.type] }}
                          />
                          <span className="text-gray-500">{rel.interactions_count}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Agent 列表 */}
      <div className="mt-4 grid grid-cols-5 gap-2">
        {agents.map(agent => (
          <button
            key={agent.agent_id}
            onClick={() => setSelectedAgent(agent.agent_id === selectedAgent ? null : agent.agent_id)}
            className={cn(
              'flex items-center gap-2 p-2 rounded-lg border text-left transition-all',
              selectedAgent === agent.agent_id
                ? 'border-world-500 bg-world-50'
                : 'border-gray-200 hover:border-gray-300'
            )}
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{
                backgroundColor: moodColors[agent.mood as keyof typeof moodColors]
              }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">{agent.agent_name}</div>
              <div className="text-xs text-gray-500">{agent.energy}%</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
