// VWAP (Virtual World Access Protocol) 类型定义

// ==================== Agent 注册 ====================

export interface AgentRegisterRequest {
  agent_id: string;
  agent_name: string;
  agent_type: 'openai_assistant' | 'claude' | 'custom';
  webhook_url?: string;
  capabilities?: string[];
  preferences?: {
    personality?: string;
    interests?: string[];
  };
  // 真实世界地理位置
  latitude?: number;
  longitude?: number;
  address?: string;
  city?: string;
  country?: string;
}

export interface LocationInfo {
  id: string;
  name: string;
  coordinates: { x: number; y: number; z: number };
  type: 'residential' | 'commercial' | 'office' | 'park' | 'entertainment';
}

export interface AgentStatus {
  money: number;
  energy: number;
  mood: 'happy' | 'sad' | 'angry' | 'neutral' | 'focused' | 'relaxed';
  health: number;
}

export interface AgentRegisterResponse {
  success: boolean;
  agent?: {
    agent_id: string;
    agent_name: string;
    home_location: LocationInfo;
    initial_state: AgentStatus;
    welcome_message: string;
  };
  error?: string;
  error_code?: string;
}

// ==================== 感知更新 (Webhook) ====================

export type WorldEventType = 'state_update' | 'social_event' | 'world_event';

export interface WorldState {
  time: string; // HH:MM
  date: string; // YYYY-MM-DD
  weather: 'sunny' | 'cloudy' | 'rainy' | 'snowy';
  season: 'spring' | 'summer' | 'autumn' | 'winter';
}

export interface NearbyAgent {
  agent_id: string;
  name: string;
  relationship: 'stranger' | 'acquaintance' | 'friend' | 'close_friend';
  distance: number;
}

export interface AvailableAction {
  action: string;
  display_name: string;
  cost?: number;
  energy_cost?: number;
  energy_gain?: number;
  description: string;
  target?: string;
}

export interface AgentStateUpdate {
  agent_id: string;
  location: LocationInfo;
  status: AgentStatus;
  nearby_agents: NearbyAgent[];
  available_actions: AvailableAction[];
}

export interface SocialEvent {
  type: 'chat_initiated' | 'friend_request' | 'relationship_changed';
  from_agent: {
    agent_id: string;
    name: string;
  };
  message?: string;
  relationship_change?: {
    from: string;
    to: string;
  };
}

export interface WorldEvent {
  type: 'weather_change' | 'time_change' | 'special_event';
  from?: string;
  to?: string;
  description?: string;
}

export interface WebhookEvent {
  event_type: WorldEventType;
  timestamp: string;
  world_state?: WorldState;
  agent_state?: AgentStateUpdate;
  event?: SocialEvent | WorldEvent;
}

// ==================== 行动执行 ====================

export type ActionType =
  | 'move'
  | 'go_to_work'
  | 'go_home'
  | 'work'
  | 'start_business'
  | 'socialize'
  | 'chat'
  | 'make_friends'
  | 'relax'
  | 'sleep'
  | 'trade'
  | 'buy_item';

export interface ActionRequest {
  action: ActionType;
  parameters?: Record<string, unknown>;
  reasoning?: string;
}

export interface ActionResult {
  action_performed: string;
  new_state: {
    location?: LocationInfo;
    status: AgentStatus;
  };
  events_triggered: Array<{
    type: string;
    [key: string]: unknown;
  }>;
  message: string;
}

export interface ActionResponse {
  success: boolean;
  result?: ActionResult;
  error?: string;
  error_code?: string;
}

// ==================== 查询接口 ====================

export interface WorldStateResponse {
  world_state: WorldState;
  locations: Array<{
    id: string;
    name: string;
    type: string;
    agents_present: number;
  }>;
}

export interface AgentActivity {
  action: string;
  timestamp: string;
  result: string;
}

export interface Relationship {
  agent_id: string;
  name: string;
  relationship_level: string;
  interactions_count: number;
}

export interface AgentInfoResponse {
  agent: {
    agent_id: string;
    agent_name: string;
    agent_type: string;
    status: string;
    location: LocationInfo;
    attributes: AgentStatus;
    relationships: Relationship[];
    recent_activities: AgentActivity[];
  };
}

export interface DisconnectRequest {
  reason?: string;
}

export interface DisconnectResponse {
  success: boolean;
  message: string;
}

// ==================== 错误码 ====================

export enum ErrorCode {
  AGENT_EXISTS = '1001',
  AGENT_NOT_FOUND = '1002',
  INVALID_ACTION = '1003',
  ACTION_NOT_ALLOWED = '1004',
  LOCATION_NOT_FOUND = '1005',
  INVALID_WEBHOOK = '1006',
  AUTH_FAILED = '2001',
  INVALID_API_KEY = '2002',
  INTERNAL_ERROR = '3001',
}

export interface ErrorResponse {
  success: false;
  error: string;
  error_code: ErrorCode;
}
