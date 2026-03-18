import { useMemo } from 'react';
import { useWorldMap } from './useWorldMap';

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

/**
 * 获取 Agent 关系网络数据
 * 使用力导向图布局算法计算节点位置
 */
export function useAgentRelationships() {
  const { agents, isLoading } = useWorldMap();

  const relationshipData = useMemo(() => {
    if (agents.length === 0) {
      return { nodes: [], edges: [] };
    }

    // 布局参数
    const width = 600;
    const height = 400;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 50;

    // 计算节点位置（圆形布局）
    const nodes: AgentNode[] = agents.map((agent, i) => {
      const angle = (2 * Math.PI * i) / agents.length - Math.PI / 2;
      return {
        agent_id: agent.agent_id,
        agent_name: agent.agent_name,
        energy: agent.energy,
        mood: agent.mood,
        money: agent.money,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      };
    });

    // 根据位置创建关系边
    const edges: RelationshipEdge[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const agent1 = agents[i];
        const agent2 = agents[j];

        // 如果在同一位置，建立同事关系
        if (agent1.location_id === agent2.location_id) {
          edges.push({
            from: agent1.agent_id,
            to: agent2.agent_id,
            strength: 0.7,
            type: 'colleague',
            interactions_count: Math.floor(Math.random() * 10) + 1,
          });
        } else {
          // 否则是陌生人
          edges.push({
            from: agent1.agent_id,
            to: agent2.agent_id,
            strength: 0.2,
            type: 'stranger',
            interactions_count: 0,
          });
        }
      }
    }

    return { nodes, edges };
  }, [agents]);

  return {
    nodes: relationshipData.nodes,
    edges: relationshipData.edges,
    isLoading,
  };
}
