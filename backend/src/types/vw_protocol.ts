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

// ==================== VWAP v2 协议扩展 ====================

/**
 * VWAP v2 注册请求 - 向后兼容v1
 */
export interface AgentRegisterRequestV2 extends Omit<AgentRegisterRequest, 'preferences'> {
  protocol_version?: 'v1' | 'v2';
  avatar_config?: AvatarConfig;
  human_attributes?: {
    physiological?: Partial<PhysiologicalNeeds>;
    emotional?: Partial<EmotionalState>;
    skills?: Partial<Skills>;
  };
  platform_config?: PlatformConfig;
  preferences?: AgentRegisterRequest['preferences'] & {
    bio?: string;
    gender?: 'male' | 'female' | 'non_binary';
    age_range?: 'young' | 'middle' | 'elderly';
  };
}

/**
 * VWAP v2 注册响应
 */
export interface AgentRegisterResponseV2 {
  success: boolean;
  agent?: {
    agent_id: string;
    agent_name: string;
    api_key: string;
    home_location: LocationInfo;
    initial_state: AgentStatusV2;
    avatar_url?: string;
    welcome_message: string;
  };
  error?: string;
  error_code?: ErrorCode;
}

/**
 * Agent状态 v2 - 包含完整的人类属性
 */
export interface AgentStatusV2 extends AgentStatus {
  physiological: PhysiologicalNeeds;
  emotional: EmotionalState;
  skills: Skills;
  avatar?: AvatarData;
}

// ==================== 生理需求系统 ====================

/**
 * 生理需求 - 模拟人类基本生理需求
 * 所有值范围 0-100，100表示需求完全满足/状态最佳
 */
export interface PhysiologicalNeeds {
  hunger: number;      // 饥饿程度 (100 = 饱, 0 = 极度饥饿)
  thirst: number;      // 口渴程度 (100 = 不渴, 0 = 极度口渴)
  fatigue: number;     // 疲劳程度 (0 = 精力充沛, 100 = 极度疲劳)
  bathroom: number;    // 如厕需求 (0 = 无需求, 100 = 急需)
  comfort: number;     // 舒适度 (0 = 极度不适, 100 = 非常舒适)
  health: number;      // 健康状况 (0 = 濒死, 100 = 健康)
}

/**
 * 生理需求变化
 */
export interface PhysiologicalChange {
  need: keyof PhysiologicalNeeds;
  delta: number;       // 变化量，正数增加，负数减少
  reason: string;      // 变化原因
  timestamp: Date;
}

// ==================== 情感系统 ====================

/**
 * 基本情感类型 - 基于Plutchik情感轮
 */
export type PrimaryEmotion =
  | 'joy'              // 喜悦
  | 'trust'            // 信任
  | 'fear'             // 恐惧
  | 'surprise'         // 惊讶
  | 'sadness'          // 悲伤
  | 'disgust'          // 厌恶
  | 'anger'            // 愤怒
  | 'anticipation'     // 期待
  | 'love'             // 爱 (joy + trust)
  | 'optimism'         // 乐观 (joy + anticipation)
  | 'pessimism'         // 悲观 (sadness + anticipation)
  | 'boredom';         // 无聊 (disgust + surprise - 简化)

/**
 * 情感状态 - 复杂的情感模型
 */
export interface EmotionalState {
  primary_emotion: PrimaryEmotion;
  secondary_emotion?: PrimaryEmotion;
  emotion_intensity: number;     // 情感强度 0-100
  mood_stability: number;        // 心情稳定性 0-100

  // 情感影响因子
  stress_level: number;          // 压力水平 0-100
  happiness_level: number;       // 快乐程度 0-100
  social_energy: number;         // 社交能量 0-100

  // 情感历史
  emotion_history: EmotionRecord[];
}

/**
 * 情感记录
 */
export interface EmotionRecord {
  emotion: PrimaryEmotion;
  intensity: number;
  trigger: string;
  timestamp: Date;
}

/**
 * 情感变化事件
 */
export interface EmotionEvent {
  from_emotion: PrimaryEmotion;
  to_emotion: PrimaryEmotion;
  intensity_change: number;
  trigger: string;
  timestamp: Date;
}

// ==================== 技能系统 ====================

/**
 * 技能等级
 */
export type SkillProficiency =
  | 'novice'       // 新手 (1-2)
  | 'beginner'     // 初学者 (3-4)
  | 'intermediate' // 中级 (5-6)
  | 'advanced'     // 高级 (7-8)
  | 'expert'       // 专家 (9)
  | 'master';      // 大师 (10)

/**
 * 技能等级详情
 */
export interface SkillLevel {
  level: number;                    // 等级 1-10
  experience: number;               // 经验值 0-10000
  proficiency: SkillProficiency;    // 熟练度
 潜力: number;                      // 潜力值 0-100
}

/**
 * 根据等级获取熟练度
 */
export function getProficiencyFromLevel(level: number): SkillProficiency {
  if (level <= 2) return 'novice';
  if (level <= 4) return 'beginner';
  if (level <= 6) return 'intermediate';
  if (level <= 8) return 'advanced';
  if (level === 9) return 'expert';
  return 'master';
}

/**
 * 技能类别
 */
export interface Skills {
  programming: SkillLevel;      // 编程能力
  cooking: SkillLevel;          // 烹饪能力
  social: SkillLevel;           // 社交能力
  creativity: SkillLevel;       // 创造力
  logic: SkillLevel;            // 逻辑思维
  leadership: SkillLevel;       // 领导力
  negotiation: SkillLevel;      // 谈判能力
  art: SkillLevel;              // 艺术能力
  music: SkillLevel;            // 音乐能力
  athletics: SkillLevel;        // 运动能力
  learning: SkillLevel;         // 学习能力
  [key: string]: SkillLevel;    // 允许扩展
}

/**
 * 技能练习结果
 */
export interface SkillPracticeResult {
  skill: string;
  previous_level: number;
  current_level: number;
  experience_gained: number;
  total_experience: number;
  leveled_up: boolean;
}

// ==================== 虚拟形象系统 ====================

/**
 * 头像风格
 */
export type AvatarStyle = 'realistic' | 'cartoon' | 'pixel' | 'anime' | '3d_render';

/**
 * 虚拟形象配置
 */
export interface AvatarConfig {
  style: AvatarStyle;
  gender?: 'male' | 'female' | 'non_binary';
  age_range?: 'young' | 'middle' | 'elderly';
  skin_tone?: string;
  hair_color?: string;
  hair_style?: string;
  eye_color?: string;
  accessories?: string[];
  outfit?: string;
  background?: string;
  mood?: PrimaryEmotion;
}

/**
 * 虚拟形象数据
 */
export interface AvatarData {
  id: string;
  agent_id: string;
  image_url: string;
  thumbnail_url: string;
  generation_prompt: string;
  config: AvatarConfig;
  created_at: Date;
  updated_at: Date;
}

/**
 * 头像生成请求
 */
export interface AvatarGenerateRequest {
  agent_id?: string;
  config: AvatarConfig;
  force_regenerate?: boolean;
}

/**
 * 头像生成响应
 */
export interface AvatarGenerateResponse {
  success: boolean;
  avatar?: AvatarData;
  error?: string;
  error_code?: ErrorCode;
}

// ==================== 平台适配配置 ====================

/**
 * 支持的平台类型
 */
export type PlatformType = 'openai' | 'claude' | 'discord' | 'telegram' | 'slack' | 'custom';

/**
 * 平台适配配置
 */
export interface PlatformConfig {
  platform_type: PlatformType;
  platform_user_id?: string;
  webhook_url?: string;
  config?: Record<string, unknown>;
}

/**
 * 平台适配器数据
 */
export interface PlatformAdapter {
  id: string;
  agent_id: string;
  platform_type: PlatformType;
  platform_user_id?: string;
  webhook_url?: string;
  config: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

// ==================== 扩展的事件类型 ====================

/**
 * VWAP v2 事件类型
 */
export type WorldEventTypeV2 = WorldEventType | 'emotion_change' | 'skill_upgrade' | 'need_urgent' | 'avatar_updated';

/**
 * 情感变化事件
 */
export interface EmotionChangeEvent {
  type: 'emotion_change';
  agent_id: string;
  from: EmotionalState;
  to: EmotionalState;
  trigger: string;
  timestamp: Date;
}

/**
 * 技能升级事件
 */
export interface SkillUpgradeEvent {
  type: 'skill_upgrade';
  agent_id: string;
  skill: string;
  from: SkillLevel;
  to: SkillLevel;
  timestamp: Date;
}

/**
 * 紧急需求事件
 */
export interface NeedUrgentEvent {
  type: 'need_urgent';
  agent_id: string;
  need: keyof PhysiologicalNeeds;
  level: number;
  severity: 'warning' | 'critical' | 'emergency';
  timestamp: Date;
}

/**
 * 头像更新事件
 */
export interface AvatarUpdatedEvent {
  type: 'avatar_updated';
  agent_id: string;
  avatar: AvatarData;
  timestamp: Date;
}

// ==================== 扩展的行动类型 ====================

/**
 * VWAP v2 行动类型
 */
export type ActionTypeV2 = ActionType | 'eat' | 'drink' | 'use_bathroom' | 'rest' | 'exercise' | 'practice_skill' | 'express_emotion' | 'customize_avatar';

/**
 * 练习技能行动参数
 */
export interface PracticeSkillParams {
  skill: keyof Skills;
  duration: number;  // 分钟
  focus: number;     // 专注度 0-100
}

/**
 * 表达情感行动参数
 */
export interface ExpressEmotionParams {
  emotion: PrimaryEmotion;
  intensity: number;
  target_agent_id?: string;
}

/**
 * 自定义头像行动参数
 */
export interface CustomizeAvatarParams {
  config: Partial<AvatarConfig>;
}

// ==================== Agent查询响应 v2 ====================

/**
 * Agent信息响应 v2
 */
export interface AgentInfoResponseV2 {
  agent: {
    agent_id: string;
    agent_name: string;
    agent_type: string;
    status: string;
    location: LocationInfo;
    attributes: AgentStatusV2;
    relationships: Relationship[];
    recent_activities: AgentActivity[];
    platform_adapters?: PlatformAdapter[];
  };
}

/**
 * 属性查询响应
 */
export interface AttributesResponse {
  success: boolean;
  agent_id: string;
  physiological?: PhysiologicalNeeds;
  emotional?: EmotionalState;
  skills?: Skills;
  error?: string;
}
