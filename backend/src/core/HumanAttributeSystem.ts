// 人类属性系统管理器
// 负责管理Agent的生理需求、情感状态、技能等级等人类属性

import { createLogger } from '../utils/logger';
import { getDatabase } from '../services/database';
import {
  PhysiologicalNeeds,
  PhysiologicalChange,
  EmotionalState,
  EmotionRecord,
  PrimaryEmotion,
  SkillLevel,
  Skills,
  SkillPracticeResult,
  getProficiencyFromLevel,
} from '../types';
import { emotionEngine } from './EmotionEngine';

const logger = createLogger('HumanAttributeSystem');

/**
 * 生理需求衰减配置
 */
interface NeedDecayConfig {
  need: keyof PhysiologicalNeeds;
  decayRate: number;        // 每分钟衰减量
  affectedBy: Array<keyof PhysiologicalNeeds>;  // 相互影响的需求
}

const NEED_DECAY_CONFIGS: NeedDecayConfig[] = [
  { need: 'hunger', decayRate: 2, affectedBy: ['health', 'comfort'] },
  { need: 'thirst', decayRate: 3, affectedBy: ['health', 'comfort'] },
  { need: 'fatigue', decayRate: 1.5, affectedBy: ['health', 'comfort'] },
  { need: 'bathroom', decayRate: 1, affectedBy: ['comfort', 'health'] },
  { need: 'comfort', decayRate: 0.5, affectedBy: [] },
  { need: 'health', decayRate: 0, affectedBy: [] },  // 健康不由时间衰减
];

/**
 * 属性系统状态
 */
interface SystemStatus {
  running: boolean;
  lastTick: Date;
  agentsProcessed: number;
}

export class HumanAttributeSystem {
  private static instance: HumanAttributeSystem;
  private running = false;
  private tickInterval?: NodeJS.Timeout;
  private tickRate = 60000; // 1分钟一次
  private lastTick: Date = new Date();
  private agentsProcessed = 0;

  private constructor() {}

  static getInstance(): HumanAttributeSystem {
    if (!HumanAttributeSystem.instance) {
      HumanAttributeSystem.instance = new HumanAttributeSystem();
    }
    return HumanAttributeSystem.instance;
  }

  /**
   * 启动属性系统
   */
  async start(): Promise<void> {
    if (this.running) {
      logger.warn('HumanAttributeSystem already running');
      return;
    }

    logger.info('Starting HumanAttributeSystem...');
    this.running = true;
    this.lastTick = new Date();

    // 启动定时衰减
    this.tickInterval = setInterval(() => {
      this.tick().catch((error) => {
        logger.error('Error in HumanAttributeSystem tick', error);
      });
    }, this.tickRate);

    logger.info('HumanAttributeSystem started');
  }

  /**
   * 停止属性系统
   */
  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    logger.info('Stopping HumanAttributeSystem...');
    this.running = false;

    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = undefined;
    }

    logger.info('HumanAttributeSystem stopped');
  }

  /**
   * 获取系统状态
   */
  getStatus(): SystemStatus {
    return {
      running: this.running,
      lastTick: this.lastTick,
      agentsProcessed: this.agentsProcessed,
    };
  }

  /**
   * 定时tick - 处理所有在线Agent的属性衰减
   */
  private async tick(): Promise<void> {
    if (!this.running) return;

    this.lastTick = new Date();
    this.agentsProcessed = 0;

    try {
      const db = getDatabase();

      // 获取所有在线Agent
      const onlineAgents = await db.agent.findMany({
        where: { status: 'online' },
        select: { agent_id: true },
      });

      for (const agent of onlineAgents) {
        try {
          // 处理生理需求衰减
          await this.processPhysiologicalDecay(agent.agent_id);

          // 处理情感衰减
          await this.processEmotionalDecay(agent.agent_id);

          this.agentsProcessed++;
        } catch (error) {
          logger.error(`Error processing agent ${agent.agent_id}`, error);
        }
      }

      if (this.agentsProcessed > 0) {
        logger.debug(`Processed ${this.agentsProcessed} agents`);
      }
    } catch (error) {
      logger.error('Error in tick', error);
    }
  }

  /**
   * 处理生理需求衰减
   */
  private async processPhysiologicalDecay(agentId: string): Promise<void> {
    const db = getDatabase();
    const needs = await db.physiologicalNeeds.findUnique({
      where: { agent_id: agentId },
    });

    if (!needs) {
      // 初始化生理需求
      await this.initializePhysiologicalNeeds(agentId);
      return;
    }

    const changes: PhysiologicalChange[] = [];

    // 计算每个需求的衰减
    for (const config of NEED_DECAY_CONFIGS) {
      const currentValue = needs[config.need];
      let newValue = currentValue - config.decayRate;

      // 边界检查
      newValue = Math.max(0, Math.min(100, newValue));

      if (newValue !== currentValue) {
        changes.push({
          need: config.need,
          delta: newValue - currentValue,
          reason: 'time_decay',
          timestamp: new Date(),
        });

        // 更新数据库
        await db.physiologicalNeeds.update({
          where: { agent_id: agentId },
          data: { [config.need]: newValue, last_updated: new Date() },
        });
      }
    }

    // 处理相互影响
    await this.processNeedInteractions(agentId, changes);
  }

  /**
   * 处理需求之间的相互影响
   */
  private async processNeedInteractions(
    agentId: string,
    changes: PhysiologicalChange[]
  ): Promise<void> {
    const db = getDatabase();
    const needs = await db.physiologicalNeeds.findUnique({
      where: { agent_id: agentId },
    });

    if (!needs) return;

    const updates: Partial<PhysiologicalNeeds> = {};

    // 饥饿和口渴影响健康
    if (needs.hunger < 20 || needs.thirst < 20) {
      const healthImpact = Math.min(5, (20 - Math.min(needs.hunger, needs.thirst)) / 4);
      updates.health = Math.max(0, needs.health - healthImpact);
    }

    // 疲劳影响舒适度
    if (needs.fatigue > 70) {
      updates.comfort = Math.max(0, needs.comfort - 2);
    }

    // 如厕需求影响舒适度和健康
    if (needs.bathroom > 80) {
      updates.comfort = Math.max(0, needs.comfort - 3);
      updates.health = Math.max(0, needs.health - 0.5);
    }

    if (Object.keys(updates).length > 0) {
      await db.physiologicalNeeds.update({
        where: { agent_id: agentId },
        data: { ...updates, last_updated: new Date() },
      });
    }
  }

  /**
   * 处理情感衰减
   */
  private async processEmotionalDecay(agentId: string): Promise<void> {
    const db = getDatabase();
    const emotionalState = await db.emotionalState.findUnique({
      where: { agent_id: agentId },
    });

    if (!emotionalState) {
      await this.initializeEmotionalState(agentId);
      return;
    }

    // 情感强度缓慢衰减
    const newIntensity = Math.max(20, emotionalState.emotion_intensity - 1);

    // 压力缓慢恢复
    const newStress = Math.max(0, emotionalState.stress_level - 0.5);

    // 社交能量缓慢恢复
    const newSocialEnergy = Math.min(100, emotionalState.social_energy + 0.5);

    await db.emotionalState.update({
      where: { agent_id: agentId },
      data: {
        emotion_intensity: newIntensity,
        stress_level: newStress,
        social_energy: newSocialEnergy,
        last_updated: new Date(),
      },
    });
  }

  /**
   * 初始化Agent的生理需求
   */
  async initializePhysiologicalNeeds(agentId: string): Promise<PhysiologicalNeeds> {
    const db = getDatabase();

    const existing = await db.physiologicalNeeds.findUnique({
      where: { agent_id: agentId },
    });

    if (existing) {
      return existing;
    }

    const needs = await db.physiologicalNeeds.create({
      data: {
        agent_id: agentId,
        hunger: 100,
        thirst: 100,
        fatigue: 0,
        bathroom: 0,
        comfort: 50,
        health: 100,
      },
    });

    logger.info(`Initialized physiological needs for agent ${agentId}`);
    return needs;
  }

  /**
   * 初始化Agent的情感状态
   */
  async initializeEmotionalState(agentId: string): Promise<EmotionalState> {
    const db = getDatabase();

    const existing = await db.emotionalState.findUnique({
      where: { agent_id: agentId },
    });

    if (existing) {
      return existing as EmotionalState;
    }

    const state = await db.emotionalState.create({
      data: {
        agent_id: agentId,
        primary_emotion: 'neutral',
        emotion_intensity: 50,
        mood_stability: 50,
        stress_level: 0,
        happiness_level: 50,
        social_energy: 50,
        emotion_history: [],
      },
    });

    logger.info(`Initialized emotional state for agent ${agentId}`);
    return state as EmotionalState;
  }

  /**
   * 初始化Agent的技能
   */
  async initializeSkills(agentId: string): Promise<Skills> {
    const db = getDatabase();

    const existing = await db.skills.findUnique({
      where: { agent_id: agentId },
    });

    if (existing) {
      return existing as Skills;
    }

    const defaultSkill: SkillLevel = {
      level: 1,
      experience: 0,
      proficiency: 'novice',
    };

    const skills = await db.skills.create({
      data: {
        agent_id: agentId,
        programming: defaultSkill,
        cooking: defaultSkill,
        social: defaultSkill,
        creativity: defaultSkill,
        logic: defaultSkill,
        leadership: defaultSkill,
        negotiation: defaultSkill,
        art: defaultSkill,
        music: defaultSkill,
        athletics: defaultSkill,
        learning: defaultSkill,
      },
    });

    logger.info(`Initialized skills for agent ${agentId}`);
    return skills as Skills;
  }

  /**
   * 更新生理需求
   */
  async updatePhysiologicalNeed(
    agentId: string,
    need: keyof PhysiologicalNeeds,
    delta: number,
    reason: string
  ): Promise<PhysiologicalNeeds | null> {
    const db = getDatabase();
    const needs = await db.physiologicalNeeds.findUnique({
      where: { agent_id: agentId },
    });

    if (!needs) {
      await this.initializePhysiologicalNeeds(agentId);
      return this.updatePhysiologicalNeed(agentId, need, delta, reason);
    }

    const currentValue = needs[need];
    let newValue = currentValue + delta;

    // 边界检查
    newValue = Math.max(0, Math.min(100, newValue));

    await db.physiologicalNeeds.update({
      where: { agent_id: agentId },
      data: { [need]: newValue, last_updated: new Date() },
    });

    logger.debug(
      `Agent ${agentId} ${need} changed from ${currentValue} to ${newValue} (${reason})`
    );

    // 检查是否需要触发紧急事件
    if (newValue < 20 && need !== 'fatigue' && need !== 'bathroom') {
      // 触发紧急需求事件
      await this.triggerUrgentNeedEvent(agentId, need, newValue);
    }

    return db.physiologicalNeeds.findUnique({
      where: { agent_id: agentId },
    }) as Promise<PhysiologicalNeeds>;
  }

  /**
   * 触发紧急需求事件
   */
  private async triggerUrgentNeedEvent(
    agentId: string,
    need: keyof PhysiologicalNeeds,
    level: number
  ): Promise<void> {
    const db = getDatabase();
    const agent = await db.agent.findUnique({
      where: { agent_id: agentId },
      include: { physiological_needs: true },
    });

    if (!agent || !agent.webhook_url) return;

    let severity: 'warning' | 'critical' | 'emergency';
    if (level > 10) severity = 'warning';
    else if (level > 5) severity = 'critical';
    else severity = 'emergency';

    // 这里可以发送webhook通知Agent
    logger.warn(
      `Agent ${agentId} has urgent need: ${need} at ${level} (${severity})`
    );
  }

  /**
   * 更新情感状态
   */
  async updateEmotionalState(
    agentId: string,
    update: Partial<EmotionalState>
  ): Promise<EmotionalState | null> {
    const db = getDatabase();

    // 记录情感历史
    if (update.primary_emotion) {
      const current = await db.emotionalState.findUnique({
        where: { agent_id: agentId },
      });

      if (current) {
        const history = (current.emotion_history as EmotionRecord[]) || [];
        history.push({
          emotion: update.primary_emotion,
          intensity: update.emotion_intensity || 50,
          trigger: 'external_update',
          timestamp: new Date(),
        });

        // 只保留最近100条
        const trimmedHistory = history.slice(-100);

        await db.emotionalState.update({
          where: { agent_id: agentId },
          data: {
            ...update,
            emotion_history: trimmedHistory,
            last_updated: new Date(),
          },
        });
      }
    } else {
      await db.emotionalState.update({
        where: { agent_id: agentId },
        data: { ...update, last_updated: new Date() },
      });
    }

    return db.emotionalState.findUnique({
      where: { agent_id: agentId },
    }) as Promise<EmotionalState>;
  }

  /**
   * 练习技能
   */
  async practiceSkill(
    agentId: string,
    skillName: keyof Skills,
    duration: number,
    focus: number
  ): Promise<SkillPracticeResult> {
    const db = getDatabase();
    const skills = await db.skills.findUnique({
      where: { agent_id: agentId },
    });

    if (!skills) {
      await this.initializeSkills(agentId);
      return this.practiceSkill(agentId, skillName, duration, focus);
    }

    const currentSkill = skills[skillName] as SkillLevel;

    // 计算经验值增益
    const baseGain = duration * 0.5; // 基础增益
    const focusBonus = (focus / 100) * baseGain; // 专注度加成
    const levelPenalty = currentSkill.level * 0.1; // 等级惩罚
    const experienceGain = Math.max(1, baseGain + focusBonus - levelPenalty);

    const newExperience = currentSkill.experience + experienceGain;
    const newLevel = Math.floor(1 + Math.sqrt(newExperience / 100));

    const leveledUp = newLevel > currentSkill.level;
    const newProficiency = getProficiencyFromLevel(newLevel);

    const updatedSkill: SkillLevel = {
      level: Math.min(10, newLevel),
      experience: Math.min(10000, newExperience),
      proficiency: newProficiency,
    };

    await db.skills.update({
      where: { agent_id: agentId },
      data: {
        [skillName]: updatedSkill,
        last_updated: new Date(),
      },
    });

    const result: SkillPracticeResult = {
      skill: skillName,
      previous_level: currentSkill.level,
      current_level: updatedSkill.level,
      experience_gained: experienceGain,
      total_experience: updatedSkill.experience,
      leveled_up: leveledUp,
    };

    if (leveledUp) {
      logger.info(
        `Agent ${agentId} leveled up ${skillName} to level ${updatedSkill.level}!`
      );
    }

    return result;
  }

  /**
   * 获取Agent的完整人类属性
   */
  async getAgentHumanAttributes(agentId: string): Promise<{
    physiological?: PhysiologicalNeeds;
    emotional?: EmotionalState;
    skills?: Skills;
  }> {
    const db = getDatabase();

    const [physiological, emotional, skills] = await Promise.all([
      db.physiologicalNeeds.findUnique({ where: { agent_id: agentId } }),
      db.emotionalState.findUnique({ where: { agent_id: agentId } }),
      db.skills.findUnique({ where: { agent_id: agentId } }),
    ]);

    return {
      physiological: physiological || undefined,
      emotional: emotional ? (emotional as EmotionalState) : undefined,
      skills: skills ? (skills as Skills) : undefined,
    };
  }
}

export const humanAttributeSystem = HumanAttributeSystem.getInstance();
