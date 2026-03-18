import { useQuery } from '@tanstack/react-query';
import { getApiUrl } from '../utils/api';

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

/**
 * 获取虚拟世界地图数据
 */
export function useWorldMap() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['world-map'],
    queryFn: async () => {
      try {
        // 获取所有 Agent 数据
        const agentsRes = await fetch(getApiUrl('/api/v1/agents/list'));
        if (!agentsRes.ok) throw new Error('Failed to fetch agents list');
        const agentsData = await agentsRes.json() as { agents: Array<{ agent_id: string; agent_name: string }> };

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
                location_id: agentData.location?.id || '',
                location_name: agentData.location?.name || 'Unknown',
                coordinates: {
                  x: agentData.location?.coordinates?.x || 0,
                  y: agentData.location?.coordinates?.y || 0,
                },
                energy: agentData.attributes?.energy || 100,
                mood: agentData.attributes?.mood || 'neutral',
                money: agentData.attributes?.money || 0,
                status: agentData.status || 'online',
              };
            } catch (err) {
              console.error(`Error fetching agent ${agent.agent_id}:`, err);
              return {
                agent_id: agent.agent_id,
                agent_name: agent.agent_name,
                location_id: 'unknown',
                location_name: 'Unknown',
                coordinates: { x: 0, y: 0 },
                energy: 100,
                mood: 'neutral',
                money: 0,
                status: 'online',
              };
            }
          })
        );

        // 获取位置信息（从 Agent 数据中提取）
        const locationMap = new Map<string, Location>();
        agentDetails.forEach(agent => {
          if (!locationMap.has(agent.location_id)) {
            locationMap.set(agent.location_id, {
              id: agent.location_id,
              location_id: agent.location_id,
              name: agent.location_name,
              type: agent.location_name.includes('公寓') || agent.location_name.includes('住宅')
                ? 'residential'
                : agent.location_name.includes('写字楼') || agent.location_name.includes('办公')
                ? 'office'
                : 'commercial',
              coordinates: {
                x: agent.coordinates.x,
                y: agent.coordinates.y,
                z: 0,
              },
            });
          }
        });

        // 获取最近的行动作为互动数据
        const interactions: Interaction[] = [];
        try {
          const actionsRes = await fetch(getApiUrl('/api/v1/agents/actions/recent?limit=10'));
          if (actionsRes.ok) {
            const actionsData = await actionsRes.json();
            if (actionsData.actions) {
              actionsData.actions
                .filter(action => action.action_type === 'socialize' || action.action_type === 'chat')
                .forEach(action => {
                  interactions.push({
                    id: action.id,
                    from_agent: action.agent_id,
                    to_agent: 'unknown',
                    type: action.action_type,
                    message: action.result?.message || '',
                    timestamp: action.performed_at,
                  });
                });
            }
          }
        } catch (err) {
          console.error('Error fetching actions:', err);
        }

        return {
          agents: agentDetails,
          locations: Array.from(locationMap.values()),
          interactions,
        };
      } catch (error) {
        console.error('Error in useWorldMap:', error);
        throw error;
      }
    },
    refetchInterval: 5000,
    retry: 1,
  });

  return {
    agents: data?.agents || [],
    locations: data?.locations || [],
    interactions: data?.interactions || [],
    isLoading,
    error,
  };
}
