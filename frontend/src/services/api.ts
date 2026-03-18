// API 服务

import axios from 'axios';
import type {
  WorldState,
  LocationSummary,
  Agent,
  ApiResponse,
} from '../types';

const API_BASE = '/api/v1';

// 创建 axios 实例
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ==================== 世界状态 ====================

/**
 * 获取世界状态
 */
export async function getWorldState(): Promise<{
  world_state: WorldState;
  locations: LocationSummary[];
}> {
  const response = await api.get('/world/state');
  return response.data;
}

/**
 * 获取世界运行状态
 */
export async function getWorldStatus() {
  const response = await api.get('/world/status');
  return response.data;
}

// ==================== Agent ====================

/**
 * 注册 Agent
 */
export async function registerAgent(data: {
  agent_id: string;
  agent_name: string;
  agent_type: 'openai_assistant' | 'claude' | 'custom';
  webhook_url?: string;
  capabilities?: string[];
  preferences?: Record<string, unknown>;
}) {
  const response = await api.post('/agents/register', data);
  return response.data;
}

/**
 * 获取 Agent 信息
 */
export async function getAgent(agentId: string): Promise<{ agent: Agent }> {
  const response = await api.get(`/agents/${agentId}`);
  return response.data;
}

/**
 * Agent 执行行动
 */
export async function executeAgentAction(
  agentId: string,
  apiKey: string,
  data: {
    action: string;
    parameters?: Record<string, unknown>;
    reasoning?: string;
  }
) {
  const response = await api.post(`/agents/${agentId}/action`, data, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
  return response.data;
}

/**
 * 断开 Agent 连接
 */
export async function disconnectAgent(
  agentId: string,
  apiKey: string,
  reason?: string
) {
  const response = await api.post(
    `/agents/${agentId}/disconnect`,
    { reason },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    }
  );
  return response.data;
}

// ==================== 健康检查 ====================

/**
 * 健康检查
 */
export async function healthCheck() {
  const response = await api.get('/health');
  return response.data;
}
