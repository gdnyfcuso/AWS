// 前端类型定义

// ==================== 世界状态 ====================

export interface WorldState {
  time: string;
  date: string;
  weather: 'sunny' | 'cloudy' | 'rainy' | 'snowy';
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  active_agents: number;
}

export interface LocationSummary {
  id: string;
  name: string;
  type: string;
  agents_present: number;
}

// ==================== Agent ====================

export interface Agent {
  agent_id: string;
  agent_name: string;
  agent_type: string;
  status: 'online' | 'offline' | 'busy';
  location: LocationInfo;
  attributes: AgentAttributes;
  relationships?: Relationship[];
  recent_activities?: Activity[];
}

export interface LocationInfo {
  id: string;
  name: string;
  coordinates: { x: number; y: number; z: number };
  type: 'residential' | 'commercial' | 'office' | 'park' | 'entertainment';
}

export interface AgentAttributes {
  money: number;
  energy: number;
  mood: 'happy' | 'sad' | 'angry' | 'neutral' | 'focused' | 'relaxed';
  health: number;
}

export interface Relationship {
  agent_id: string;
  name: string;
  relationship_level: string;
  interactions_count: number;
}

export interface Activity {
  action: string;
  timestamp: string;
  result: string;
}

// ==================== 事件 ====================

export interface WorldEvent {
  id: string;
  event_type: string;
  timestamp: string;
  data: Record<string, unknown>;
  agent_id?: string;
}

// ==================== API 响应 ====================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  error_code?: string;
}

// ==================== 地图 ====================

// 重新导出地图类型
export * from './map';
