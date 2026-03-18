// 技能系统服务
// 管理Agent的技能等级、经验值、熟练度等

import { createLogger } from '../utils/logger';
import { getDatabase } from './database';
import {
  Skills,
  SkillLevel,
  SkillProficiency,
  SkillPracticeResult,
  getProficiencyFromLevel,
} from '../types';

const logger = createLogger('SkillService');

/**
 * 技能经验值配置
 * 每个等级所需的经验值 = level * 100
 */
const EXPERIENCE_PER_LEVEL = 100;

/**
 * 技能等级上限
 */
const MAX_LEVEL = 10;

/**
 * 技能潜力值上限
 */
const MAX_POTENTIAL = 100;

/**
 * 技能熟练度等级边界
 */
const PROFICIENCY_BOUNDARIES = {
  novice: [1, 2],
  beginner: [3, 4],
  intermediate: [5, 6],
  advanced: [7, 8],
  expert: [9],
  master: [10],
};

/**
 * 技能系统服务类
 */
export class SkillService {
  private static instance: SkillService;

  private constructor() {}

  static getInstance(): SkillService {
    if (!SkillService.instance) {
      SkillService.instance = new SkillService();
    }
    return SkillService.instance;
  }

  /**
   * 获取Agent的技能
   */
  async getAgentSkills(agentId: string): Promise<Skills | null> {
    const db = getDatabase();
    const skills = await db.skills.findUnique({
      where: { agent_id: agentId },
    });

    if (!skills) {
      return null;
    }

    return this.formatSkills(skills);
  }

  /**
   * 格式化技能数据
   */
  private formatSkills(skills: any): Skills {
    const formatted: any = {};

    // 标准技能
    const standardSkills = [
      'programming',
      'cooking',
      'social',
      'creativity',
      'logic',
      'leadership',
      'negotiation',
      'art',
      'music',
      'athletics',
      'learning',
    ];

    for (const skill of standardSkills) {
      if (skills[skill]) {
        formatted[skill] = skills[skill];
      }
    }

    // 扩展技能
    if (skills.extended_skills) {
      const extended = skills.extended_skills as Record<string, SkillLevel>;
      for (const [key, value] of Object.entries(extended)) {
        formatted[key] = value;
      }
    }

    return formatted as Skills;
  }

  /**
   * 练习技能
   */
  async practiceSkill(
    agentId: string,
    skillName: keyof Skills,
    duration: number,  // 练习时长（分钟）
    options?: {
      focus?: number;         // 专注度 0-100
      difficulty?: number;    // 难度 1-10
      with_mentor?: boolean;  // 是否有导师指导
    }
  ): Promise<SkillPracticeResult> {
    const db = getDatabase();
    const skills = await db.skills.findUnique({
      where: { agent_id: agentId },
    });

    if (!skills) {
      throw new Error('Agent skills not found');
    }

    const currentSkill = this.getSkillLevel(skills, skillName);

    // 计算经验值增益
    const baseGain = this.calculateExperienceGain(
      duration,
      currentSkill.level,
      options
    );

    const newExperience = Math.min(
      MAX_LEVEL * EXPERIENCE_PER_LEVEL,
      currentSkill.experience + baseGain
    );

    const newLevel = Math.min(
      MAX_LEVEL,
      1 + Math.floor(newExperience / EXPERIENCE_PER_LEVEL)
    );

    const leveledUp = newLevel > currentSkill.level;
    const newProficiency = getProficiencyFromLevel(newLevel);

    const updatedSkill: SkillLevel = {
      level: newLevel,
      experience: newExperience,
      proficiency: newProficiency,
    };

    // 更新数据库
    await this.updateSkillLevel(agentId, skillName, updatedSkill);

    const result: SkillPracticeResult = {
      skill: skillName,
      previous_level: currentSkill.level,
      current_level: newLevel,
      experience_gained: baseGain,
      total_experience: newExperience,
      leveled_up: leveledUp,
    };

    if (leveledUp) {
      logger.info(
        `Agent ${agentId} leveled up ${skillName} from ${currentSkill.level} to ${newLevel}!`
      );
    }

    return result;
  }

  /**
   * 从数据库记录中获取技能等级
   */
  private getSkillLevel(skills: any, skillName: keyof Skills): SkillLevel {
    // 检查标准技能
    if (skills[skillName]) {
      return skills[skillName] as SkillLevel;
    }

    // 检查扩展技能
    if (skills.extended_skills && skills.extended_skills[skillName]) {
      return skills.extended_skills[skillName] as SkillLevel;
    }

    // 返回默认值
    return {
      level: 1,
      experience: 0,
      proficiency: 'novice',
    };
  }

  /**
   * 计算经验值增益
   */
  private calculateExperienceGain(
    duration: number,
    currentLevel: number,
    options?: {
      focus?: number;
      difficulty?: number;
      with_mentor?: boolean;
    }
  ): number {
    const focus = options?.focus || 50;
    const difficulty = options?.difficulty || 5;
    const withMentor = options?.with_mentor || false;

    // 基础增益
    let baseGain = duration * 0.5;

    // 专注度加成
    const focusBonus = (focus / 100) * baseGain * 0.5;

    // 难度加成
    const difficultyBonus = ((difficulty - 5) / 5) * baseGain * 0.3;

    // 等级惩罚（等级越高，经验获取越慢）
    const levelPenalty = (currentLevel / MAX_LEVEL) * baseGain * 0.5;

    // 导师加成
    const mentorBonus = withMentor ? baseGain * 0.3 : 0;

    const totalGain = Math.max(
      1,
      baseGain + focusBonus + difficultyBonus + mentorBonus - levelPenalty
    );

    return Math.round(totalGain);
  }

  /**
   * 更新技能等级
   */
  private async updateSkillLevel(
    agentId: string,
    skillName: keyof Skills,
    skillLevel: SkillLevel
  ): Promise<void> {
    const db = getDatabase();

    // 检查是否为标准技能
    const standardSkills = [
      'programming',
      'cooking',
      'social',
      'creativity',
      'logic',
      'leadership',
      'negotiation',
      'art',
      'music',
      'athletics',
      'learning',
    ];

    if (standardSkills.includes(skillName as string)) {
      await db.skills.update({
        where: { agent_id: agentId },
        data: {
          [skillName]: skillLevel,
          last_updated: new Date(),
        },
      });
    } else {
      // 扩展技能，存储在 extended_skills
      const skills = await db.skills.findUnique({
        where: { agent_id: agentId },
      });

      const extendedSkills = (skills?.extended_skills as Record<string, SkillLevel>) || {};
      extendedSkills[skillName] = skillLevel;

      await db.skills.update({
        where: { agent_id: agentId },
        data: {
          extended_skills: extendedSkills,
          last_updated: new Date(),
        },
      });
    }
  }

  /**
   * 获取技能等级描述
   */
  getSkillLevelDescription(skillLevel: SkillLevel): string {
    const descriptions: Record<SkillProficiency, string> = {
      novice: '初学者 - 刚开始学习',
      beginner: '新手 - 了解基础知识',
      intermediate: '中级 - 能够熟练运用',
      advanced: '高级 - 精通该技能',
      expert: '专家 - 该领域的权威',
      master: '大师 - 已达到巅峰',
    };

    return descriptions[skillLevel.proficiency];
  }

  /**
   * 获取技能进度百分比
   */
  getSkillProgress(skillLevel: SkillLevel): number {
    const currentLevelExp = skillLevel.experience % EXPERIENCE_PER_LEVEL;
    return (currentLevelExp / EXPERIENCE_PER_LEVEL) * 100;
  }

  /**
   * 比较两个Agent的技能
   */
  async compareSkills(
    agentId1: string,
    agentId2: string
  ): Promise<{
    agent1: Skills;
    agent2: Skills;
    differences: Record<string, { agent1: number; agent2: number; diff: number }>;
  }> {
    const [skills1, skills2] = await Promise.all([
      this.getAgentSkills(agentId1),
      this.getAgentSkills(agentId2),
    ]);

    if (!skills1 || !skills2) {
      throw new Error('One or both agents not found');
    }

    const differences: Record<string, { agent1: number; agent2: number; diff: number }> = {};

    // 获取所有技能名称
    const allSkills = new Set([
      ...Object.keys(skills1),
      ...Object.keys(skills2),
    ]);

    for (const skillName of allSkills) {
      const level1 = skills1[skillName]?.level || 0;
      const level2 = skills2[skillName]?.level || 0;

      differences[skillName] = {
        agent1: level1,
        agent2: level2,
        diff: level1 - level2,
      };
    }

    return {
      agent1: skills1,
      agent2: skills2,
      differences,
    };
  }

  /**
   * 获取Agent最擅长的技能
   */
  async getTopSkills(
    agentId: string,
    limit: number = 5
  ): Promise<Array<{ skill: keyof Skills; level: number; proficiency: SkillProficiency }>> {
    const skills = await this.getAgentSkills(agentId);

    if (!skills) {
      return [];
    }

    const skillArray = Object.entries(skills).map(([skill, level]) => ({
      skill: skill as keyof Skills,
      level: (level as SkillLevel).level,
      proficiency: (level as SkillLevel).proficiency,
    }));

    return skillArray
      .sort((a, b) => b.level - a.level)
      .slice(0, limit);
  }

  /**
   * 添加自定义技能
   */
  async addCustomSkill(
    agentId: string,
    skillName: string,
    initialLevel: number = 1
  ): Promise<SkillLevel> {
    const db = getDatabase();
    const skills = await db.skills.findUnique({
      where: { agent_id: agentId },
    });

    if (!skills) {
      throw new Error('Agent skills not found');
    }

    const skillLevel: SkillLevel = {
      level: Math.min(MAX_LEVEL, Math.max(1, initialLevel)),
      experience: (initialLevel - 1) * EXPERIENCE_PER_LEVEL,
      proficiency: getProficiencyFromLevel(initialLevel),
    };

    const extendedSkills = (skills.extended_skills as Record<string, SkillLevel>) || {};
    extendedSkills[skillName] = skillLevel;

    await db.skills.update({
      where: { agent_id: agentId },
      data: {
        extended_skills: extendedSkills,
        last_updated: new Date(),
      },
    });

    logger.info(`Added custom skill ${skillName} to agent ${agentId}`);

    return skillLevel;
  }

  /**
   * 计算技能对行动的影响
   */
  calculateSkillBonus(
    skillName: keyof Skills,
    skillLevel: SkillLevel,
    actionType: string
  ): number {
    // 技能等级加成
    const levelBonus = skillLevel.level * 5; // 每级5%加成

    // 熟练度加成
    const proficiencyBonus = {
      novice: 0,
      beginner: 5,
      intermediate: 10,
      advanced: 20,
      expert: 30,
      master: 50,
    };

    const totalBonus = levelBonus + proficiencyBonus[skillLevel.proficiency];

    // 根据行动类型调整
    const actionMultipliers: Record<string, Record<string, number>> = {
      programming: { work: 1.5, socialize: 0.5 },
      social: { socialize: 1.5, work: 0.8 },
      cooking: { work: 1.0, socialize: 1.0 },
      creativity: { work: 1.2, socialize: 0.8 },
      leadership: { socialize: 1.3, work: 1.0 },
    };

    const multiplier =
      actionMultipliers[skillName]?.[actionType] || 1.0;

    return totalBonus * multiplier;
  }

  /**
   * 检查技能是否满足要求
   */
  checkSkillRequirement(
    skillLevel: SkillLevel,
    requiredLevel: number
  ): { meets: boolean; gap: number } {
    const gap = skillLevel.level - requiredLevel;
    return {
      meets: gap >= 0,
      gap,
    };
  }

  /**
   * 获取技能训练建议
   */
  async getTrainingRecommendation(
    agentId: string,
    targetSkill?: keyof Skills
  ): Promise<{
    skill: keyof Skills;
    currentLevel: number;
    recommendedAction: string;
    estimatedTime: number; // 分钟
  }> {
    const skills = await this.getAgentSkills(agentId);

    if (!skills) {
      throw new Error('Agent skills not found');
    }

    // 如果指定了技能，推荐该技能
    if (targetSkill) {
      const skillLevel = skills[targetSkill] as SkillLevel;
      return {
        skill: targetSkill,
        currentLevel: skillLevel.level,
        recommendedAction: `practice ${targetSkill}`,
        estimatedTime: 30,
      };
    }

    // 否则推荐经验值最低的技能
    const allSkills = Object.entries(skills).map(([skill, level]) => ({
      skill: skill as keyof Skills,
      level: (level as SkillLevel).level,
      experience: (level as SkillLevel).experience,
    }));

    const lowestSkill = allSkills.sort((a, b) => a.experience - b.experience)[0];

    return {
      skill: lowestSkill.skill,
      currentLevel: lowestSkill.level,
      recommendedAction: `practice ${lowestSkill.skill}`,
      estimatedTime: 30,
    };
  }
}

export const skillService = SkillService.getInstance();
