// 类型定义统一导出

export * from './vw_protocol';
export * from './agent';
export * from './world';
export * from './terrain';
export * from './vehicle';
export * from './road';

// 通用类型
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  error_code?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

// WebSocket 消息类型
export interface WSMessage {
  type: 'world_update' | 'agent_update' | 'event' | 'error';
  data: unknown;
  timestamp: string;
}
