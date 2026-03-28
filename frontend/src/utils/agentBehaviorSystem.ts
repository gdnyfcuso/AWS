/**
 * Agent 行为系统 - 模拟真实 Agent 行为逻辑
 */

export interface AgentState {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  energy: number;
  mood: 'happy' | 'neutral' | 'sad' | 'angry';
  status: 'online' | 'offline';
  currentActivity?: string;
  targetPosition?: { x: number; y: number; z: number };
  relationships: Map<string, number>; // agentId -> affinity score
  preferences: {
    personality: 'friendly' | 'aggressive' | 'shy';
    interests: string[];
  };
}

export interface LocationData {
  id: string;
  name: string;
  type: 'home' | 'work' | 'shop' | 'park' | 'entertainment';
  position: { x: number; y: number; z: number };
  capacity: number;
}

/**
 * Agent 行为系统
 */
export class AgentBehaviorSystem {
  private agents: Map<string, AgentState> = new Map();
  private locations: Map<string, LocationData> = new Map();
  private currentTime: number = 0; // 0-24 小时制

  constructor() {
    this.initializeLocations();
  }

  /**
   * 初始化城市地点
   */
  private initializeLocations(): void {
    this.locations.set('home-1', {
      id: 'home-1',
      name: '阳光公寓 A-101',
      type: 'home',
      position: { x: 10, y: 0, z: 10 },
      capacity: 4,
    });

    this.locations.set('work-1', {
      id: 'work-1',
      name: '科技园办公楼',
      type: 'work',
      position: { x: 50, y: 0, z: 50 },
      capacity: 100,
    });

    this.locations.set('shop-1', {
      id: 'shop-1',
      name: '便利店',
      type: 'shop',
      position: { x: 20, y: 0, z: 15 },
      capacity: 10,
    });

    this.locations.set('park-1', {
      id: 'park-1',
      name: '中央公园',
      type: 'park',
      position: { x: 30, y: 0, z: 30 },
      capacity: 50,
    });
  }

  /**
   * 添加 Agent
   */
  addAgent(agent: Omit<AgentState, 'relationships'>): void {
    const agentWithRelationships: AgentState = {
      ...agent,
      relationships: new Map(),
    };
    this.agents.set(agent.id, agentWithRelationships);
  }

  /**
   * 更新所有 Agent 状态
   */
  update(deltaTime: number): void {
    this.currentTime = (this.currentTime + deltaTime) % 24;

    this.agents.forEach(agent => {
      this.updateAgentActivity(agent);
      this.updateAgentPosition(agent, deltaTime);
    });
  }

  /**
   * 更新 Agent 活动
   */
  private updateAgentActivity(agent: AgentState): void {
    const hour = this.currentTime;

    // 通勤逻辑：早上去公司，晚上回家
    if (hour >= 7 && hour < 9) {
      agent.currentActivity = 'commute_to_work';
      agent.targetPosition = this.locations.get('work-1')?.position;
    } else if (hour >= 9 && hour < 18) {
      agent.currentActivity = 'working';
      agent.targetPosition = this.locations.get('work-1')?.position;
    } else if (hour >= 18 && hour < 20) {
      agent.currentActivity = 'commute_home';
      agent.targetPosition = this.locations.get('home-1')?.position;
    } else if (hour >= 20 || hour < 7) {
      agent.currentActivity = 'sleeping';
      agent.targetPosition = this.locations.get('home-1')?.position;
    }
  }

  /**
   * 更新 Agent 位置
   */
  private updateAgentPosition(agent: AgentState, deltaTime: number): void {
    if (!agent.targetPosition) return;

    const speed = 5; // 米/秒
    const dx = agent.targetPosition.x - agent.position.x;
    const dz = agent.targetPosition.z - agent.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    if (distance < 0.5) {
      // 到达目标
      agent.position = { ...agent.targetPosition };
    } else {
      // 移动向目标
      const ratio = Math.min((speed * deltaTime) / distance, 1);
      agent.position.x += dx * ratio;
      agent.position.z += dz * ratio;
    }
  }

  /**
   * 获取 Agent 状态
   */
  getAgent(id: string): AgentState | undefined {
    return this.agents.get(id);
  }

  /**
   * 获取所有 Agent
   */
  getAllAgents(): AgentState[] {
    return Array.from(this.agents.values());
  }

  /**
   * 社交互动：两个 Agent 邻近时可能交流
   */
  checkSocialInteraction(agent1: AgentState, agent2: AgentState): boolean {
    const distance = Math.sqrt(
      Math.pow(agent1.position.x - agent2.position.x, 2) +
      Math.pow(agent1.position.z - agent2.position.z, 2)
    );

    if (distance < 5) {
      // 增加亲密度
      const affinity1 = agent1.relationships.get(agent2.id) || 0;
      const affinity2 = agent2.relationships.get(agent1.id) || 0;

      agent1.relationships.set(agent2.id, Math.min(affinity1 + 0.1, 1));
      agent2.relationships.set(agent1.id, Math.min(affinity2 + 0.1, 1));

      return true;
    }

    return false;
  }

  /**
   * 获取 Agent 偏好的活动地点
   */
  getPreferredLocation(agent: AgentState): LocationData | undefined {
    const preferences = {
      friendly: ['park', 'entertainment'],
      aggressive: ['shop', 'entertainment'],
      shy: ['home'],
    };

    const preferredTypes = preferences[agent.preferences.personality] || [];
    const locations = Array.from(this.locations.values());

    return locations.find(loc => preferredTypes.includes(loc.type));
  }

  /**
   * 设置虚拟时间
   */
  setTime(hours: number): void {
    this.currentTime = hours % 24;
  }

  /**
   * 获取当前时间
   */
  getTime(): number {
    return this.currentTime;
  }
}

/**
 * 创建 Agent 行为系统的工厂函数
 */
export function createAgentBehaviorSystem(): AgentBehaviorSystem {
  return new AgentBehaviorSystem();
}
