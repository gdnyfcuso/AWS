import { useRef, useMemo } from 'react';
import * as THREE from 'three';

export interface AgentData {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  energy: number;
  mood: 'happy' | 'neutral' | 'sad' | 'angry';
  status: 'online' | 'offline';
}

export interface AgentRendererProps {
  agents: AgentData[];
  selectedAgentId?: string | null;
  onAgentClick?: (agent: AgentData) => void;
}

// 情绪颜色映射
const MOOD_COLORS = {
  happy: 0x4ade80,
  neutral: 0x94a3b8,
  sad: 0x60a5fa,
  angry: 0xf87171,
};

export function AgentRenderer({ agents, selectedAgentId, onAgentClick }: AgentRendererProps) {
  const groupRef = useRef<THREE.Group>(null);

  const agentMeshes = useMemo(() => {
    return agents.map((agent) => {
      const group = new THREE.Group();
      group.position.set(agent.position.x, agent.position.y, agent.position.z);

      // Agent 身体
      const geometry = new THREE.CapsuleGeometry(0.5, 1, 4, 8);
      const material = new THREE.MeshStandardMaterial({
        color: MOOD_COLORS[agent.mood],
        roughness: 0.5,
        metalness: 0.1,
        emissive: MOOD_COLORS[agent.mood],
        emissiveIntensity: agent.id === selectedAgentId ? 0.3 : 0,
      });
      const body = new THREE.Mesh(geometry, material);
      body.position.y = 0.75;
      body.castShadow = true;
      group.add(body);

      // Agent 头部
      const headGeometry = new THREE.SphereGeometry(0.3, 8, 8);
      const headMaterial = new THREE.MeshStandardMaterial({
        color: 0xffdbac,
        roughness: 0.8,
      });
      const head = new THREE.Mesh(headGeometry, headMaterial);
      head.position.y = 1.6;
      head.castShadow = true;
      group.add(head);

      // 能量光环
      const energyRatio = agent.energy / 100;
      const ringGeometry = new THREE.RingGeometry(0.6, 0.7, 32);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: energyRatio > 0.5 ? 0x22c55e : 0xef4444,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.05;
      group.add(ring);

      // 点击区域
      const hitArea = new THREE.Mesh(
        new THREE.CylinderGeometry(1, 1, 2, 8),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hitArea.position.y = 1;
      hitArea.userData = { agent };
      group.add(hitArea);

      return { group, agent, hitArea };
    });
  }, [agents, selectedAgentId]);

  return (
    <group ref={groupRef}>
      {agentMeshes.map(({ group, agent, hitArea }) => (
        <primitive
          key={agent.id}
          object={group}
          onClick={(e) => {
            e.stopPropagation();
            onAgentClick?.(agent);
          }}
        />
      ))}
    </group>
  );
}
