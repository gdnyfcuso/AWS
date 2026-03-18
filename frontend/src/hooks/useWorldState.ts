// 使用世界状态 Hook

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getWorldState, getWorldStatus } from '../services/api';
import type { WorldState, LocationSummary } from '../types';

/**
 * 获取世界状态
 */
export function useWorldState() {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['world', 'state'],
    queryFn: async () => {
      const data = await getWorldState();
      return data;
    },
    refetchInterval: 5000, // 每5秒刷新
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
    queryFn: getWorldStatus,
    refetchInterval: 5000,
  });

  return {
    status: data,
    isLoading,
    error,
  };
}
