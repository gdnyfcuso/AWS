// 3D 虚拟世界可视化组件

import { useEffect, useRef, useState } from 'react';
import { cn } from '../utils/cn';

interface Building3D {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  color: string;
}

interface Agent3D {
  agent_id: string;
  agent_name: string;
  x: number;
  y: number;
  z: number;
  energy: number;
  mood: string;
  targetX?: number;
  targetY?: number;
  targetZ?: number;
}

interface World3DProps {
  agents: Agent3D[];
  buildings: Building3D[];
}

const moodColors = {
  happy: '#22c55e',
  sad: '#3b82f6',
  angry: '#ef4444',
  neutral: '#6b7280',
  focused: '#8b5cf6',
  relaxed: '#06b6d4',
};

const buildingColors = {
  residential: '#10b981',
  commercial: '#f59e0b',
  office: '#3b82f6',
  park: '#22c55e',
  entertainment: '#ec4899',
};

export function World3D({ agents, buildings }: World3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState(0);
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [animationFrame, setAnimationFrame] = useState(0);

  // 3D 投影参数
  const camera = {
    x: 400,
    y: 200,
    z: 500,
    fov: 500,
  };

  // 自动旋转
  useEffect(() => {
    const interval = setInterval(() => {
      setRotation(prev => (prev + 0.2) % 360);
      setAnimationFrame(prev => (prev + 1) % 200);
    }, 30);
    return () => clearInterval(interval);
  }, []);

  // 3D 到 2D 投影
  const project3D = (x: number, y: number, z: number) => {
    // 旋转变换
    const rad = (rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const rotatedX = x * cos - z * sin;
    const rotatedZ = x * sin + z * cos;

    // 透视投影
    const scale = camera.fov / (camera.fov + rotatedZ + camera.z);
    const screenX = camera.x + rotatedX * scale;
    const screenY = camera.y + y * scale;

    return { x: screenX, y: screenY, scale };
  };

  // 绘制 3D 场景
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制天空渐变
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    skyGradient.addColorStop(0, '#87CEEB');
    skyGradient.addColorStop(0.5, '#E0F6FF');
    skyGradient.addColorStop(1, '#90EE90');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制地面网格
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    for (let i = -500; i <= 500; i += 50) {
      // 横线
      const p1 = project3D(i, 100, -500);
      const p2 = project3D(i, 100, 500);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      // 竖线
      const p3 = project3D(-500, 100, i);
      const p4 = project3D(500, 100, i);
      ctx.beginPath();
      ctx.moveTo(p3.x, p3.y);
      ctx.lineTo(p4.x, p4.y);
      ctx.stroke();
    }

    // 按深度排序建筑和 Agent
    const renderables: Array<{
      type: 'building' | 'agent';
      depth: number;
      data: Building3D | Agent3D;
    }> = [];

    buildings.forEach(building => {
      const center = project3D(building.x, building.y, building.z);
      renderables.push({
        type: 'building',
        depth: center.x,
        data: building,
      });
    });

    agents.forEach(agent => {
      const center = project3D(agent.x, agent.y, agent.z);
      renderables.push({
        type: 'agent',
        depth: center.x,
        data: agent,
      });
    });

    // 按深度排序（远的先绘制）
    renderables.sort((a, b) => a.depth - b.depth);

    // 绘制建筑
    renderables
      .filter(r => r.type === 'building')
      .forEach(r => {
        const building = r.data as Building3D;
        drawBuilding3D(ctx, building as Building3D);
      });

    // 绘制 Agent
    renderables
      .filter(r => r.type === 'agent')
      .forEach(r => {
        const agent = r.data as Agent3D;
        drawAgent3D(ctx, agent as Agent3D);
      });

  }, [agents, buildings, rotation, animationFrame, selectedAgent, hoveredAgent]);

  // 绘制 3D 建筑
  const drawBuilding3D = (ctx: CanvasRenderingContext2D, building: Building3D) => {
    const w = building.width;
    const d = building.depth;
    const h = building.height;

    // 建筑的 8 个顶点
    const vertices = [
      { x: building.x - w/2, y: building.y, z: building.z - d/2 }, // 前左下
      { x: building.x + w/2, y: building.y, z: building.z - d/2 }, // 前右下
      { x: building.x + w/2, y: building.y, z: building.z + d/2 }, // 后右下
      { x: building.x - w/2, y: building.y, z: building.z + d/2 }, // 后左下
      { x: building.x - w/2, y: building.y - h, z: building.z - d/2 }, // 前左上
      { x: building.x + w/2, y: building.y - h, z: building.z - d/2 }, // 前右上
      { x: building.x + w/2, y: building.y - h, z: building.z + d/2 }, // 后右上
      { x: building.x - w/2, y: building.y - h, z: building.z + d/2 }, // 后左上
    ];

    // 投影所有顶点
    const projected = vertices.map(v => project3D(v.x, v.y, v.z));

    // 绘制建筑面（前、右、顶）
    const faces = [
      { indices: [0, 1, 5, 4], color: building.color, shade: 1 },    // 前面
      { indices: [1, 2, 6, 5], color: building.color, shade: 0.8 },  // 右面
      { indices: [2, 3, 7, 6], color: building.color, shade: 0.6 },  // 后面
      { indices: [3, 0, 4, 7], color: building.color, shade: 0.7 },  // 左面
      { indices: [4, 5, 6, 7], color: '#ffffff', shade: 0.9 },       // 顶面
    ];

    faces.forEach(face => {
      ctx.beginPath();
      face.indices.forEach((i, idx) => {
        const p = projected[i];
        if (idx === 0) {
          ctx.moveTo(p.x, p.y);
        } else {
          ctx.lineTo(p.x, p.y);
        }
      });
      ctx.closePath();

      // 应用阴影
      const baseColor = face.color;
      const alpha = face.shade;
      ctx.fillStyle = baseColor;
      ctx.globalAlpha = alpha;
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // 绘制建筑名称
    const topCenter = project3D(building.x, building.y - h - 20, building.z);
    ctx.fillStyle = '#333';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(building.name, topCenter.x, topCenter.y);
  };

  // 绘制 3D Agent
  const drawAgent3D = (ctx: CanvasRenderingContext2D, agent: Agent3D) => {
    const pos = project3D(agent.x, agent.y, agent.z);
    const isSelected = selectedAgent === agent.agent_id;
    const isHovered = hoveredAgent === agent.agent_id;

    // Agent 阴影
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y + 5, 8 * pos.scale, 4 * pos.scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Agent 身体
    const moodColor = moodColors[agent.mood as keyof typeof moodColors] || '#6b7280';
    const bodySize = (isSelected ? 12 : 10) * pos.scale;

    // 光晕效果
    if (isSelected || isHovered) {
      const gradient = ctx.createRadialGradient(pos.x, pos.y - bodySize, 0, pos.x, pos.y - bodySize, bodySize * 2);
      gradient.addColorStop(0, moodColor + '40');
      gradient.addColorStop(1, moodColor + '00');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y - bodySize, bodySize * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 身体
    ctx.fillStyle = moodColor;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y - bodySize, bodySize, 0, Math.PI * 2);
    ctx.fill();

    // 边框
    ctx.strokeStyle = isSelected ? '#000' : '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 头部
    ctx.fillStyle = '#FFE4C4';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y - bodySize * 2.5, bodySize * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#DEB887';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 名称
    ctx.fillStyle = '#333';
    ctx.font = `${10 * pos.scale}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(agent.agent_name, pos.x, pos.y - bodySize * 3.5);

    // 能量条
    const barWidth = 20 * pos.scale;
    const barHeight = 3 * pos.scale;
    const barX = pos.x - barWidth / 2;
    const barY = pos.y - bodySize * 3.5 - 12;

    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    const energyColor = agent.energy > 50 ? '#22c55e' : agent.energy > 20 ? '#f59e0b' : '#ef4444';
    ctx.fillStyle = energyColor;
    ctx.fillRect(barX, barY, barWidth * (agent.energy / 100), barHeight);
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    let clickedAgent = null;
    agents.forEach(agent => {
      const pos = project3D(agent.x, agent.y, agent.z);
      const distance = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - (pos.y - 10), 2));
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
      const pos = project3D(agent.x, agent.y, agent.z);
      const distance = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - (pos.y - 10), 2));
      if (distance < 20) {
        found = agent.agent_id;
      }
    });

    setHoveredAgent(found);
  };

  const displayAgent = agents.find(a => a.agent_id === (hoveredAgent || selectedAgent));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">3D 虚拟世界</h2>
          <p className="text-xs text-gray-500 mt-1">实时观察 Agent 在三维空间的活动</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <button
            onClick={() => setRotation(0)}
            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
          >
            重置视角
          </button>
        </div>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={800}
          height={500}
          className="border border-gray-200 rounded-lg cursor-pointer w-full"
          style={{ maxWidth: '100%', height: 'auto' }}
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMouseMove}
          onMouseLeave={() => setHoveredAgent(null)}
        />

        {/* Agent 详情卡片 */}
        {displayAgent && (
          <div className="absolute top-4 right-4 bg-white/95 backdrop-blur rounded-lg shadow-xl border border-gray-200 p-4 min-w-48">
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
                <span className="text-gray-600">位置</span>
                <span className="font-medium text-gray-900">
                  ({displayAgent.x}, {displayAgent.y}, {displayAgent.z})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">能量</span>
                <span
                  className="font-medium"
                  style={{
                    color: displayAgent.energy > 50 ? '#22c55e' : displayAgent.energy > 20 ? '#f59e0b' : '#ef4444'
                  }}
                >
                  {displayAgent.energy}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">心情</span>
                <div className="flex items-center gap-1">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: moodColors[displayAgent.mood as keyof typeof moodColors]
                    }}
                  />
                  <span className="font-medium text-gray-900">{displayAgent.mood}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 建筑/位置图例 */}
      <div className="mt-4 grid grid-cols-5 gap-2">
        {Object.entries(buildingColors).map(([type, color]) => (
          <div key={type} className="flex items-center gap-2 text-xs">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: color }}
            />
            <span className="text-gray-600 capitalize">
              {type === 'residential' ? '住宅' :
               type === 'commercial' ? '商业' :
               type === 'office' ? '办公' :
               type === 'park' ? '公园' : '娱乐'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
