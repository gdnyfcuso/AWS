import { useQuery } from '@tanstack/react-query';
import { getApiUrl } from '../utils/api';

interface GeographicAgent {
  agent_id: string;
  agent_name: string;
  lat: number | null;
  lng: number | null;
  address: string | null;
  city: string | null;
  country: string | null;
  status: string;
  energy: number;
  mood: string;
  last_seen: string;
}

/**
 * 获取 Agent 地理位置数据
 */
export function useRealWorldAgents() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['agents-geographic'],
    queryFn: async () => {
      const response = await fetch(getApiUrl('/api/v1/agents/geographic'));
      if (!response.ok) throw new Error('Failed to fetch geographic agents');
      const result = await response.json();
      // Transform latitude/longitude to lat/lng
      return {
        agents: result.agents.map((agent: any) => ({
          ...agent,
          lat: agent.latitude,
          lng: agent.longitude,
        }))
      };
    },
    refetchInterval: 5000,
    retry: 1,
  });

  return {
    agents: data?.agents || [],
    isLoading,
    error,
  };
}
