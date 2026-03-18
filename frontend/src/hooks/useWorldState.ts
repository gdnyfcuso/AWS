// 使用世界状态 Hook

import { useQuery } from '@tanstack/react-query';
import { getWorldState } from '../services/api';
import type { WorldState, LocationSummary } from '../types';

/**
 * 获取世界状态
 */
export function useWorldState() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['world', 'state'],
    queryFn: async () => {
      const data = await getWorldState();
      return data;
    },
    refetchInterval: 5000,
    retry: 1,
  });

  return {
    worldState: data?.world_state,
    locations: data?.locations,
    isLoading,
    error,
    refetch,
  };
}

/**
 * 获取世界运行状态
 */
export function useWorldStatus() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['world', 'status'],
    queryFn: async () => {
      const response = await fetch('/api/v1/world/status');
      if (!response.ok) throw new Error('Failed to fetch status');
      return response.json();
    },
    refetchInterval: 5000,
    retry: 1,
  });

  return {
    status: data,
    isLoading,
    error,
  };
}
