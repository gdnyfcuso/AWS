// World 内部类型定义

export interface Location {
  id: string;
  location_id: string;
  name: string;
  description?: string;
  type: 'residential' | 'commercial' | 'office' | 'park' | 'entertainment';
  coordinates: { x: number; y: number; z: number };
  max_capacity?: number;
  current_agents: number;
  parent_location_id?: string;
  created_at: Date;
}

export interface WorldStateData {
  id: string;
  world_time: string;
  world_date: string;
  day_phase: 'morning' | 'afternoon' | 'evening' | 'night';
  weather: 'sunny' | 'cloudy' | 'rainy' | 'snowy';
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  active_agents: number;
  total_events_today: number;
  updated_at: Date;
}

export interface Action {
  id: string;
  agent_id: string;
  action_type: string;
  parameters?: Record<string, unknown>;
  reasoning?: string;
  success: boolean;
  result?: Record<string, unknown>;
  error_message?: string;
  state_changes?: Record<string, unknown>;
  performed_at: Date;
}

export interface Event {
  id: string;
  event_type: string;
  timestamp: Date;
  data: Record<string, unknown>;
  agent_id?: string;
  delivered: boolean;
  delivered_at?: Date;
}

export interface Relationship {
  id: string;
  agent_id: string;
  target_agent_id: string;
  relationship_type: 'stranger' | 'acquaintance' | 'friend' | 'close_friend' | 'partner';
  relationship_level: number;
  interactions_count: number;
  last_interaction?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  message_type: string;
  location_id: string;
  sent_at: Date;
  read_at?: Date;
}

export interface Transaction {
  id: string;
  sender_id: string;
  receiver_id: string;
  amount: number;
  transaction_type: string;
  description?: string;
  metadata?: Record<string, unknown>;
  created_at: Date;
}

// 世界配置
export interface WorldConfig {
  timeSpeed: number; // 时间流逝速度倍数
  startTime: string; // HH:MM
  startDate: string; // YYYY-MM-DD
  initialWeather: 'sunny' | 'cloudy' | 'rainy' | 'snowy';
  initialSeason: 'spring' | 'summer' | 'autumn' | 'winter';
}
