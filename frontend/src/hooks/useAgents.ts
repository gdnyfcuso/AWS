import { useQuery } from '@tanstack/react-query';

interface AgentListItem {
  agent_id: string;
  agent_name: string;
  agent_type: string;
  status: string;
}

interface AgentDetail {
  agent_id: string;
  agent_name: string;
  agent_type: string;
  status: string;
  location: {
    id: string;
    name: string;
    coordinates: { x: number; y: number; z: number };
    type: string;
  };
  attributes: {
    money: number;
    energy: number;
    mood: string;
    health: number;
  };
  relationships?: Array<{
    agent_id: string;
    name: string;
    relationship_level: string;
    interactions_count: number;
  }>;
  recent_activities?: Array<{
    action: string;
    result: string;
    timestamp: string;
  }>;
}

/**
 * 获取所有在线 Agent 列表
 */
export function useAgents() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const response = await fetch('/api/v1/agents/list');
      if (!response.ok) {
        throw new Error('Failed to fetch agents');
      }
      return response.json() as Promise<{ agents: AgentListItem[] }>;
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

/**
 * 获取单个 Agent（公开端点，无需认证）
 */
export function useAgent(agentId: string) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['agent', agentId],
    queryFn: async () => {
      const response = await fetch(`/api/v1/agents/${agentId}/view`);
      if (!response.ok) {
        throw new Error('Failed to fetch agent');
      }
      return response.json() as { agent: AgentDetail };
    },
    enabled: !!agentId,
    refetchInterval: 5000,
    retry: 1,
  });

  return {
    agent: data?.agent,
    isLoading,
    error,
    refetch,
  };
}

export type { AgentDetail, AgentListItem };

/**
 * Agent 执行行动
 */
export function useExecuteAction() {
  const executeAction = async (
    agentId: string,
    apiKey: string,
    action: string,
    parameters?: Record<string, unknown>
  ) => {
    const response = await fetch(`/api/v1/agents/${agentId}/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ action, parameters }),
    });
    return response.json();
  };

  return { executeAction };
}

/**
 * 断开 Agent 连接
 */
export function useDisconnectAgent() {
  const disconnectAgent = async (agentId: string, apiKey: string, reason?: string) => {
    const response = await fetch(`/api/v1/agents/${agentId}/disconnect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ reason }),
    });
    return response.json();
  };

  return { disconnectAgent };
}
