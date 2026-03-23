// 虚拟世界可视化地图 - 显示 Agent 位置和互动

import { useEffect, useState, useRef } from 'react';
import { cn } from '../utils/cn';
import { useResponsiveClasses } from '../hooks/useMobileDetection';

interface Location {
  id: string;
  location_id: string;
  name: string;
  type: string;
  coordinates: { x: number; y: number; z: number };
}

interface AgentOnMap {
  agent_id: string;
  agent_name: string;
  location_id: string;
  location_name: string;
  coordinates: { x: number; y: number };
  energy: number;
  mood: string;
  money: number;
  status: string;
}

interface Interaction {
  id: string;
  from_agent: string;
  to_agent: string;
  type: string;
  message: string;
  timestamp: string;
}

interface AgentWorldMapProps {
  agents: AgentOnMap[];
  locations: Location[];
  interactions?: Interaction[];
}

const locationColors = {
  residential: { fill: 'rgba(16, 185, 129, 0.2)', stroke: '#10b981' },
  commercial: { fill: 'rgba(245, 158, 11, 0.2)', stroke: '#f59e0b' },
  office: { fill: 'rgba(59, 130, 246, 0.2)', stroke: '#3b82f6' },
  park: { fill: 'rgba(34, 197, 94, 0.2)', stroke: '#22c55e' },
  entertainment: { fill: 'rgba(236, 72, 153, 0.2)', stroke: '#ec4899' },
};

const moodColors = {
  happy: '#22c55e',
  sad: '#3b82f6',
  angry: '#ef4444',
  neutral: '#6b7280',
  focused: '#8b5cf6',
  relaxed: '#06b6d4',
};

const moodLabels = {
  happy: '开心',
  sad: '悲伤',
  angry: '愤怒',
  neutral: '平静',
  focused: '专注',
  relaxed: '放松',
};

export function AgentWorldMap({ agents, locations, interactions = [] }: AgentWorldMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [animationFrame, setAnimationFrame] = useState(0);
  const responsive = useResponsiveClasses();

  // 地图配置 - 调整以适应实际的坐标范围
  const mapConfig = {
    width: 900,
    height: 600,
    scale: 1.0, // 降低缩放比例
    offsetX: 50,  // 减少偏移
    offsetY: 50,  // 减少偏移
  };

  // 动画效果
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationFrame(prev => (prev + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // 绘制地图
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制背景渐变
    const gradient = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, 0,
      canvas.width / 2, canvas.height / 2, canvas.width / 2
    );
    gradient.addColorStop(0, '#f9fafb');
    gradient.addColorStop(1, '#f3f4f6');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制网格
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 40) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
      ctx.stroke();
    }

    // 绘制位置之间的道路
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    locations.forEach((loc1, i) => {
      locations.slice(i + 1).forEach(loc2 => {
        const x1 = loc1.coordinates.x * mapConfig.scale + mapConfig.offsetX;
        const y1 = loc1.coordinates.y * mapConfig.scale + mapConfig.offsetY;
        const x2 = loc2.coordinates.x * mapConfig.scale + mapConfig.offsetX;
        const y2 = loc2.coordinates.y * mapConfig.scale + mapConfig.offsetY;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      });
    });
    ctx.setLineDash([]);

    // 绘制位置区域
    locations.forEach(location => {
      const x = location.coordinates.x * mapConfig.scale + mapConfig.offsetX;
      const y = location.coordinates.y * mapConfig.scale + mapConfig.offsetY;
      const colorData = locationColors[location.type as keyof typeof locationColors] || locationColors.residential;

      // 绘制位置区域（带脉动效果）
      const pulseSize = Math.sin(animationFrame * 0.1) * 5;
      ctx.fillStyle = colorData.fill;
      ctx.beginPath();
      ctx.arc(x, y, 45 + pulseSize, 0, Math.PI * 2);
      ctx.fill();

      // 绘制位置边框
      ctx.strokeStyle = colorData.stroke;
      ctx.lineWidth = 3;
      ctx.stroke();

      // 绘制位置名称
      ctx.fillStyle = '#374151';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(location.name, x, y + 65);
    });

    // 绘制 Agent 之间的互动线
    interactions.forEach(interaction => {
      const fromAgent = agents.find(a => a.agent_id === interaction.from_agent);
      const toAgent = agents.find(a => a.agent_id === interaction.to_agent);

      if (fromAgent && toAgent) {
        const x1 = fromAgent.coordinates.x * mapConfig.scale + mapConfig.offsetX;
        const y1 = fromAgent.coordinates.y * mapConfig.scale + mapConfig.offsetY;
        const x2 = toAgent.coordinates.x * mapConfig.scale + mapConfig.offsetX;
        const y2 = toAgent.coordinates.y * mapConfig.scale + mapConfig.offsetY;

        // 绘制互动线（动画效果）
        const lineProgress = (animationFrame % 50) / 50;
        const currentX = x1 + (x2 - x1) * lineProgress;
        const currentY = y1 + (y2 - y1) * lineProgress;

        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // 绘制移动的点
        ctx.fillStyle = '#8b5cf6';
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(currentX, currentY, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // 绘制同一位置的 Agent 之间的连接
    agents.forEach((agent, i) => {
      agents.slice(i + 1).forEach(otherAgent => {
        if (agent.location_id === otherAgent.location_id) {
          const x1 = agent.coordinates.x * mapConfig.scale + mapConfig.offsetX;
          const y1 = agent.coordinates.y * mapConfig.scale + mapConfig.offsetY;
          const x2 = otherAgent.coordinates.x * mapConfig.scale + mapConfig.offsetX;
          const y2 = otherAgent.coordinates.y * mapConfig.scale + mapConfig.offsetY;

          ctx.strokeStyle = '#c4b5fd';
          ctx.lineWidth = 1;
          ctx.globalAlpha = 0.4;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.globalAlpha = 1;
        }
      });
    });

    // 绘制 Agent
    agents.forEach(agent => {
      const x = agent.coordinates.x * mapConfig.scale + mapConfig.offsetX;
      const y = agent.coordinates.y * mapConfig.scale + mapConfig.offsetY;

      const isSelected = selectedAgent === agent.agent_id;
      const isHovered = hoveredAgent === agent.agent_id;

      // 绘制 Agent 光环（脉动效果）
      if (isSelected || isHovered) {
        const pulseSize = Math.sin(animationFrame * 0.15) * 8 + 20;
        ctx.fillStyle = moodColors[agent.mood as keyof typeof moodColors] || '#6b7280';
        ctx.globalAlpha = 0.2;
        ctx.beginPath();
        ctx.arc(x, y, pulseSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // 绘制 Agent 圆点
      const moodColor = moodColors[agent.mood as keyof typeof moodColors] || '#6b7280';
      ctx.fillStyle = moodColor;
      ctx.beginPath();
      ctx.arc(x, y, isSelected ? 14 : 11, 0, Math.PI * 2);
      ctx.fill();

      // 绘制 Agent 边框
      ctx.strokeStyle = isSelected ? '#1f2937' : '#ffffff';
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.stroke();

      // 绘制能量条
      const barWidth = 24;
      const barHeight = 4;
      const barX = x - barWidth / 2;
      const barY = y + 18;

      ctx.fillStyle = '#e5e7eb';
      ctx.fillRect(barX, barY, barWidth, barHeight);

      const energyColor = agent.energy > 50 ? '#22c55e' : agent.energy > 20 ? '#f59e0b' : '#ef4444';
      ctx.fillStyle = energyColor;
      ctx.fillRect(barX, barY, barWidth * (agent.energy / 100), barHeight);

      // 绘制 Agent 名称
      ctx.fillStyle = '#374151';
      ctx.font = isSelected ? 'bold 12px sans-serif' : '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(agent.agent_name, x, y - 20);
    });

  }, [agents, locations, interactions, selectedAgent, hoveredAgent, animationFrame, mapConfig]);

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // 检查是否点击了 Agent
    let clickedAgent = null;
    agents.forEach(agent => {
      const agentX = agent.coordinates.x * mapConfig.scale + mapConfig.offsetX;
      const agentY = agent.coordinates.y * mapConfig.scale + mapConfig.offsetY;
      const distance = Math.sqrt(Math.pow(x - agentX, 2) + Math.pow(y - agentY, 2));

      if (distance < 20) {
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
      const agentX = agent.coordinates.x * mapConfig.scale + mapConfig.offsetX;
      const agentY = agent.coordinates.y * mapConfig.scale + mapConfig.offsetY;
      const distance = Math.sqrt(Math.pow(x - agentX, 2) + Math.pow(y - agentY, 2));

      if (distance < 20) {
        found = agent.agent_id;
      }
    });

    setHoveredAgent(found);
  };

  const displayAgent = agents.find(a => a.agent_id === (hoveredAgent || selectedAgent));
  const sameLocationAgents = displayAgent
    ? agents.filter(a => a.location_id === displayAgent.location_id && a.agent_id !== displayAgent.agent_id)
    : [];

  return (
    <div className={cn("bg-white rounded-xl border border-gray-200", responsive.cardPadding)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className={cn("font-semibold text-gray-900", responsive.sectionTitle)}>虚拟世界地图</h2>
          {!responsive.isMobile && (
            <p className="text-xs text-gray-500 mt-1">实时显示 Agent 位置和互动</p>
          )}
        </div>
        {!responsive.isMobile && (
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span>住宅</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span>办公</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <span>互动</span>
            </div>
          </div>
        )}
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={mapConfig.width}
          height={mapConfig.height}
          className="border border-gray-200 rounded-lg cursor-crosshair w-full"
          style={{ maxWidth: '100%', height: 'auto' }}
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMouseMove}
          onMouseLeave={() => setHoveredAgent(null)}
        />

        {/* Agent 详情卡片 */}
        {displayAgent && (
          <div className={cn(
            "absolute bg-white rounded-lg shadow-xl border border-gray-200",
            responsive.isMobile
              ? "bottom-2 left-2 right-2 p-3"
              : "top-4 right-4 p-4 min-w-56"
          )}>
            <div className={cn("flex items-center mb-3", responsive.isMobile ? "gap-1" : "gap-2")}>
              <div
                className={cn("rounded-full", responsive.isMobile ? "w-3 h-3" : "w-4 h-4")}
                style={{
                  backgroundColor: moodColors[displayAgent.mood as keyof typeof moodColors]
                }}
              />
              <span className={cn("font-bold text-gray-900", responsive.isMobile ? "text-sm" : "")}>{displayAgent.agent_name}</span>
              <span className="text-xs text-gray-500">•</span>
              <span className={cn("text-gray-500", responsive.isMobile ? "text-xs truncate max-w-[100px]" : "text-xs")}>{displayAgent.agent_id}</span>
            </div>
            <div className={cn("space-y-2", responsive.isMobile ? "text-xs" : "text-sm")}>
              <div className="flex justify-between">
                <span className="text-gray-600">位置</span>
                <span className="font-medium text-gray-900">{displayAgent.location_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">能量</span>
                <span className="font-medium" style={{ color: displayAgent.energy > 50 ? '#22c55e' : displayAgent.energy > 20 ? '#f59e0b' : '#ef4444' }}>
                  {displayAgent.energy}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">心情</span>
                <span className="font-medium text-gray-900">{moodLabels[displayAgent.mood as keyof typeof moodLabels]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">金币</span>
                <span className="font-medium text-yellow-600">💰 {displayAgent.money}</span>
              </div>
            </div>

            {/* 同位置的 Agent */}
            {sameLocationAgents.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className={cn("text-gray-500 mb-2", responsive.isMobile ? "text-xs" : "text-xs")}>附近的 Agent</div>
                <div className="space-y-1">
                  {sameLocationAgents.map(agent => (
                    <div key={agent.agent_id} className={cn("flex items-center gap-2", responsive.isMobile ? "text-xs" : "text-xs")}>
                      <div
                        className={cn("rounded-full", responsive.isMobile ? "w-1.5 h-1.5" : "w-2 h-2")}
                        style={{
                          backgroundColor: moodColors[agent.mood as keyof typeof moodColors]
                        }}
                      />
                      <span className="text-gray-700">{agent.agent_name}</span>
                      <span className="text-gray-400">{agent.energy}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Agent 状态栏 */}
      <div className={cn(
        "mt-4 grid gap-2",
        responsive.isMobile ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-5"
      )}>
        {agents.map(agent => (
          <button
            key={agent.agent_id}
            onClick={() => setSelectedAgent(agent.agent_id === selectedAgent ? null : agent.agent_id)}
            className={cn(
              'flex items-center gap-2 p-2 rounded-lg border text-left transition-all',
              selectedAgent === agent.agent_id
                ? 'border-world-500 bg-world-50 shadow-md'
                : 'border-gray-200 hover:border-gray-300 hover:shadow-sm',
              responsive.isMobile ? "gap-1" : "gap-2"
            )}
          >
            <div
              className={cn("rounded-full flex-shrink-0", responsive.isMobile ? "w-2 h-2" : "w-3 h-3")}
              style={{
                backgroundColor: moodColors[agent.mood as keyof typeof moodColors]
              }}
            />
            <div className="flex-1 min-w-0">
              <div className={cn("font-medium text-gray-900 truncate", responsive.isMobile ? "text-xs" : "text-sm")}>{agent.agent_name}</div>
              <div className={cn("flex items-center gap-1 text-gray-500", responsive.isMobile ? "text-xs hidden" : "text-xs")}>
                <span className="truncate">{agent.location_name}</span>
                <span>•</span>
                <span>{agent.energy}%</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
