// Agent 相关 Hooks

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAgent, executeAgentAction, disconnectAgent } from '../services/api';
import type { Agent } from '../types';

/**
 * 获取单个 Agent
 */
export function useAgent(agentId: string) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['agent', agentId],
    queryFn: async () => {
      const data = await getAgent(agentId);
      return data.agent;
    },
    enabled: !!agentId,
    refetchInterval: 5000,
  });

  return {
    agent: data,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Agent 执行行动
 */
export function useExecuteAction() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      agentId,
      apiKey,
      action,
      parameters,
      reasoning,
    }: {
      agentId: string;
      apiKey: string;
      action: string;
      parameters?: Record<string, unknown>;
      reasoning?: string;
    }) => {
      return executeAgentAction(agentId, apiKey, { action, parameters, reasoning });
    },
    onSuccess: (data, variables) => {
      // 刷新 Agent 状态
      queryClient.invalidateQueries({ queryKey: ['agent', variables.agentId] });
    },
  });

  return {
    executeAction: mutation.mutate,
    isExecuting: mutation.isPending,
    error: mutation.error,
    result: mutation.data,
  };
}

/**
 * 断开 Agent 连接
 */
export function useDisconnectAgent() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      agentId,
      apiKey,
      reason,
    }: {
      agentId: string;
      apiKey: string;
      reason?: string;
    }) => {
      return disconnectAgent(agentId, apiKey, reason);
    },
    onSuccess: () => {
      // 刷新世界状态
      queryClient.invalidateQueries({ queryKey: ['world'] });
    },
  });

  return {
    disconnectAgent: mutation.mutate,
    isDisconnecting: mutation.isPending,
    error: mutation.error,
  };
}
