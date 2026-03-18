// Agent 内部类型定义

export interface Agent {
  id: string;
  agent_id: string;
  agent_name: string;
  agent_type: string;
  webhook_url?: string;
  api_key: string;
  capabilities?: string[];
  preferences?: Record<string, unknown>;
  status: 'online' | 'offline' | 'busy';
  last_ping?: Date;
  home_location_id?: string;
  created_at: Date;
  updated_at: Date;
  disconnected_at?: Date;
}

export interface AgentState {
  id: string;
  agent_id: string;
  location_id: string;
  money: number;
  energy: number;
  mood: string;
  health: number;
  total_earned: number;
  total_spent: number;
  interactions_count: number;
  updated_at: Date;
}

export interface CreateAgentDto {
  agent_id: string;
  agent_name: string;
  agent_type: string;
  webhook_url?: string;
  capabilities?: string[];
  preferences?: Record<string, unknown>;
}

export interface UpdateAgentDto {
  agent_name?: string;
  webhook_url?: string;
  capabilities?: string[];
  preferences?: Record<string, unknown>;
}
