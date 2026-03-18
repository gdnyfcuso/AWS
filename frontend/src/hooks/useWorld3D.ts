import { useQuery } from '@tanstack/react-query';
import { getApiUrl } from '../utils/api';

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
  money: number;
}

/**
 * 获取3D虚拟世界数据
 */
export function useWorld3D() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['world-3d'],
    queryFn: async () => {
      try {
        // 获取所有 Agent 数据
        const agentsRes = await fetch(getApiUrl('/api/v1/agents/list'));
        if (!agentsRes.ok) throw new Error('Failed to fetch agents list');
        const agentsData = await agentsRes.json();

        // 获取每个 Agent 的详情
        const agentDetails = await Promise.all(
          agentsData.agents.map(async (agent) => {
            try {
              const res = await fetch(getApiUrl(`/api/v1/agents/${agent.agent_id}/view`));
              if (!res.ok) throw new Error(`Failed to fetch agent ${agent.agent_id}`);
              const data = await res.json();

              // 兼容不同的响应格式
              const agentData = data.agent || data;

              return {
                agent_id: agentData.agent_id || agent.agent_id,
                agent_name: agentData.agent_name || agent.agent_name,
                x: agentData.location?.coordinates?.x || 0,
                y: agentData.location?.coordinates?.y || 0,
                z: agentData.location?.coordinates?.z || 0,
                energy: agentData.attributes?.energy || 100,
                mood: agentData.attributes?.mood || 'neutral',
                money: agentData.attributes?.money || 0,
              };
            } catch (err) {
              console.error(`Error fetching agent ${agent.agent_id}:`, err);
              return {
                agent_id: agent.agent_id,
                agent_name: agent.agent_name,
                x: 0,
                y: 0,
                z: 0,
                energy: 100,
                mood: 'neutral',
                money: 0,
              };
            }
          })
        );

        // 定义建筑数据
        const buildings: Building3D[] = [
          {
            id: 'residential_sunshine',
            name: '阳光公寓',
            type: 'residential',
            x: 100,
            y: 100,
            z: 0,
            width: 80,
            depth: 80,
            height: 60,
            color: '#10b981',
          },
          {
            id: 'office_tech_park',
            name: '科技园区写字楼',
            type: 'office',
            x: 500,
            y: 100,
            z: 0,
            width: 120,
            depth: 100,
            height: 100,
            color: '#3b82f6',
          },
          {
            id: 'commercial_mall',
            name: '购物中心',
            type: 'commercial',
            x: 300,
            y: 100,
            z: -100,
            width: 100,
            depth: 80,
            height: 50,
            color: '#f59e0b',
          },
          {
            id: 'park_central',
            name: '中央公园',
            type: 'park',
            x: 300,
            y: 100,
            z: 100,
            width: 150,
            depth: 150,
            height: 20,
            color: '#22c55e',
          },
          {
            id: 'entertainment_game',
            name: '游戏娱乐中心',
            type: 'entertainment',
            x: 650,
            y: 100,
            z: -50,
            width: 80,
            depth: 80,
            height: 40,
            color: '#ec4899',
          },
        ];

        return {
          agents: agentDetails,
          buildings,
        };
      } catch (error) {
        console.error('Error in useWorld3D:', error);
        throw error;
      }
    },
    refetchInterval: 5000,
    retry: 1,
  });

  return {
    agents: data?.agents || [],
    buildings: data?.buildings || [],
    isLoading,
    error,
  };
}
