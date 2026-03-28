import { useState, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { AgentRenderer, AgentData } from '../renderers/AgentRenderer';
import { useViewState } from '../../stores/viewState';

interface NarrativeViewProps {
  scene: THREE.Scene | null;
  camera: THREE.Camera | null;
}

// 模拟 Agent 数据
const mockAgents: AgentData[] = [
  {
    id: 'agent1',
    name: '主角 Alice',
    position: { x: 0, y: 0, z: 0 },
    energy: 75,
    mood: 'happy',
    status: 'online',
  },
  {
    id: 'agent2',
    name: '配角 Bob',
    position: { x: 8, y: 0, z: 5 },
    energy: 60,
    mood: 'neutral',
    status: 'online',
  },
];

export function NarrativeView({ scene, camera }: NarrativeViewProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [focusedAgentId, setFocusedAgentId] = useState<string | null>('agent1');
  const { setViewMode } = useViewState();

  useEffect(() => {
    if (!scene || !camera) return;

    // 设置相机到叙事视角位置
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.position.set(50, 20, 50);
      camera.lookAt(0, 0, 0);
    }
  }, [scene, camera]);

  // 播放循环
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentTime(prev => prev + playbackSpeed);
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed]);

  // 相机跟随焦点 Agent
  useEffect(() => {
    if (!focusedAgentId || !camera) return;

    const agent = mockAgents.find(a => a.id === focusedAgentId);
    if (!agent) return;

    // 平滑移动相机
    const targetPos = new THREE.Vector3(
      agent.position.x + 15,
      12,
      agent.position.z + 15
    );

    // 这里应该使用 TWEEN，简化处理直接设置
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.position.lerp(targetPos, 0.05);
      camera.lookAt(agent.position.x, 1, agent.position.z);
    }
  }, [focusedAgentId, camera]);

  const handleAgentClick = useCallback((agent: AgentData) => {
    setFocusedAgentId(agent.id);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* 电影式黑边 */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-black z-20 pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-black z-20 pointer-events-none" />

      {/* 主角高亮 */}
      {focusedAgentId && (
        <div className="absolute top-20 left-4 bg-black/70 text-white px-3 py-2 rounded z-20">
          <div className="text-sm">关注: {mockAgents.find(a => a.id === focusedAgentId)?.name}</div>
        </div>
      )}

      {/* 播放控制 */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/70 px-6 py-3 rounded-lg z-20">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="text-white text-xl w-10 h-10 flex items-center justify-center hover:bg-white/20 rounded"
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        <div className="text-white font-mono text-lg min-w-[60px] text-center">
          {formatTime(currentTime)}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPlaybackSpeed(Math.max(0.5, playbackSpeed - 0.5))}
            className="text-white px-2 py-1 hover:bg-white/20 rounded text-sm"
          >
            -
          </button>
          <span className="text-white text-sm w-12 text-center">{playbackSpeed}x</span>
          <button
            onClick={() => setPlaybackSpeed(Math.min(4, playbackSpeed + 0.5))}
            className="text-white px-2 py-1 hover:bg-white/20 rounded text-sm"
          >
            +
          </button>
        </div>

        <div className="h-1 w-32 bg-gray-600 rounded overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all"
            style={{ width: `${(currentTime % 300) / 3}%` }}
          />
        </div>
      </div>

      {/* 字幕区域 */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 text-center z-20">
        {currentTime > 5 && currentTime < 10 && (
          <div className="bg-black/80 text-white px-4 py-2 rounded text-lg">
            "新的一天开始了..."
          </div>
        )}
      </div>

      {/* 场景内容 */}
      <AgentRenderer
        agents={mockAgents}
        selectedAgentId={focusedAgentId}
        onAgentClick={handleAgentClick}
      />
    </>
  );
}
