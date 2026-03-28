import { useState, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { AgentRenderer, AgentData } from '../renderers/AgentRenderer';
import { DialogueRenderer, DialogueData } from '../renderers/DialogueRenderer';

interface MicroViewProps {
  scene: THREE.Scene | null;
  camera: THREE.Camera | null;
  renderer: THREE.WebGLRenderer | null;
  selectedAgentId?: string | null;
  onAgentClick?: (agentId: string) => void;
}

// 模拟 Agent 数据
const mockAgents: AgentData[] = [
  {
    id: 'agent1',
    name: 'Alice',
    position: { x: 0, y: 0, z: 0 },
    energy: 85,
    mood: 'happy',
    status: 'online',
  },
  {
    id: 'agent2',
    name: 'Bob',
    position: { x: 5, y: 0, z: 5 },
    energy: 60,
    mood: 'neutral',
    status: 'online',
  },
  {
    id: 'agent3',
    name: 'Charlie',
    position: { x: -5, y: 0, z: 3 },
    energy: 40,
    mood: 'sad',
    status: 'online',
  },
];

// 模拟对话数据
const mockDialogues: DialogueData[] = [
  {
    id: 'dialogue1',
    agentId: 'agent1',
    message: '你好！今天天气真不错！',
    mood: 'happy',
    timestamp: Date.now() - 1000,
  },
];

export function MicroView({
  scene,
  camera,
  renderer,
  selectedAgentId,
  onAgentClick,
}: MicroViewProps) {
  const [agents] = useState<AgentData[]>(mockAgents);
  const [dialogues, setDialogues] = useState<DialogueData[]>(mockDialogues);

  useEffect(() => {
    if (!scene || !camera) return;

    // 设置相机到微观视角位置
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.position.set(20, 15, 20);
      camera.lookAt(0, 0, 0);
    }

    // 模拟对话生成
    const interval = setInterval(() => {
      const messages = [
        '你好！', '最近怎么样？', '一起去吃饭吧！',
        '今天工作完成了', '明天见！', '谢谢你的帮助',
      ];
      const moods = ['happy', 'neutral', 'happy', 'happy', 'neutral', 'happy'] as const;

      const newDialogue: DialogueData = {
        id: `dialogue-${Date.now()}`,
        agentId: agents[Math.floor(Math.random() * agents.length)].id,
        message: messages[Math.floor(Math.random() * messages.length)],
        mood: moods[Math.floor(Math.random() * moods.length)],
        timestamp: Date.now(),
      };

      setDialogues(prev => [...prev, newDialogue]);

      // 清理过期对话
      setTimeout(() => {
        setDialogues(prev => prev.filter(d => d.id !== newDialogue.id));
      }, 8000);
    }, 5000);

    return () => clearInterval(interval);
  }, [scene, camera, agents]);

  const handleAgentClick = useCallback((agent: AgentData) => {
    console.log('Agent clicked:', agent);
    onAgentClick?.(agent.id);
  }, [onAgentClick]);

  return (
    <>
      <AgentRenderer
        agents={agents}
        selectedAgentId={selectedAgentId}
        onAgentClick={handleAgentClick}
      />

      <DialogueRenderer
        dialogues={dialogues}
        scene={scene}
        camera={camera}
        renderer={renderer}
      />

      {/* Agent 信息面板 */}
      {selectedAgentId && (
        <div className="absolute bottom-4 left-4 bg-white/90 p-4 rounded-lg shadow-lg max-w-xs">
          {(() => {
            const agent = agents.find(a => a.id === selectedAgentId);
            if (!agent) return null;
            return (
              <>
                <h3 className="font-semibold text-lg">{agent.name}</h3>
                <div className="text-sm text-gray-600 mt-2">
                  <div>能量: {agent.energy}%</div>
                  <div>情绪: {agent.mood}</div>
                  <div>状态: {agent.status}</div>
                </div>
              </>
            );
          })()}
        </div>
      )}
    </>
  );
}
