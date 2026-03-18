// 情感计算引擎
// 基于Plutchik情感轮实现复杂的情感状态计算和转换

import { createLogger } from '../utils/logger';
import {
  PrimaryEmotion,
  EmotionalState,
  EmotionRecord,
  EmotionEvent,
} from '../types';

const logger = createLogger('EmotionEngine');

/**
 * Plutchik情感轮 - 8种基本情感及其对立面
 */
const EMOTION_OPPOSITES: Record<PrimaryEmotion, PrimaryEmotion> = {
  joy: 'sadness',
  sadness: 'joy',
  trust: 'disgust',
  disgust: 'trust',
  fear: 'anger',
  anger: 'fear',
  surprise: 'anticipation',
  anticipation: 'surprise',
  love: 'disgust',
  optimism: 'pessimism',
  pessimism: 'optimism',
  boredom: 'surprise',
};

/**
 * 情感组合规则 - 两种基本情感组合形成复杂情感
 */
const EMOTION_COMBINATIONS: Record<string, PrimaryEmotion> = {
  'joy+trust': 'love',
  'joy+anticipation': 'optimism',
  'sadness+anticipation': 'pessimism',
  'disgust+surprise': 'boredom',
};

/**
 * 情感衰减率 - 每分钟衰减的情感强度
 */
const EMOTION_DECAY_RATE = 2;

/**
 * 情感触发事件
 */
interface EmotionTrigger {
  type: 'social' | 'action' | 'world' | 'physiological';
  event: string;
  impact: number; // -100 to 100
  target_emotions?: PrimaryEmotion[];
}

/**
 * 事件对情感的影响映射
 */
const EVENT_EMOTION_IMPACTS: Record<string, Omit<EmotionTrigger, 'type'>> = {
  // 社交事件
  'chat_initiated': { event: 'chat_initiated', impact: 10, target_emotions: ['joy'] },
  'friend_request_accepted': { event: 'friend_request_accepted', impact: 30, target_emotions: ['joy', 'trust'] },
  'friend_request_rejected': { event: 'friend_request_rejected', impact: -20, target_emotions: ['sadness'] },
  'argument': { event: 'argument', impact: -30, target_emotions: ['anger'] },
  'praise_received': { event: 'praise_received', impact: 25, target_emotions: ['joy'] },

  // 行动事件
  'work_completed': { event: 'work_completed', impact: 15, target_emotions: ['joy'] },
  'work_failed': { event: 'work_failed', impact: -20, target_emotions: ['sadness', 'anger'] },
  'skill_improved': { event: 'skill_improved', impact: 20, target_emotions: ['joy'] },
  'task_achieved': { event: 'task_achieved', impact: 25, target_emotions: ['joy', 'anticipation'] },

  // 生理需求影响
  'hunger_critical': { event: 'hunger_critical', impact: -30, target_emotions: ['anger', 'irritation'] },
  'fatigue_high': { event: 'fatigue_high', impact: -25, target_emotions: ['sadness'] },
  'health_restored': { event: 'health_restored', impact: 20, target_emotions: ['joy'] },

  // 世界事件
  'weather_bad': { event: 'weather_bad', impact: -10, target_emotions: ['sadness'] },
  'weather_good': { event: 'weather_good', impact: 10, target_emotions: ['joy'] },
};

/**
 * 情感状态类
 */
export class EmotionEngine {
  private static instance: EmotionEngine;

  private constructor() {}

  static getInstance(): EmotionEngine {
    if (!EmotionEngine.instance) {
      EmotionEngine.instance = new EmotionEngine();
    }
    return EmotionEngine.instance;
  }

  /**
   * 根据事件计算情感变化
   */
  calculateEmotionChange(
    currentState: EmotionalState,
    eventType: string,
    context?: {
      intensity?: number;
      relationships?: Record<string, number>;
      physiologicalState?: {
        hunger: number;
        thirst: number;
        fatigue: number;
        health: number;
      };
    }
  ): EmotionEvent {
    const impact = EVENT_EMOTION_IMPACTS[eventType];

    if (!impact) {
      // 无预设影响，返回中性情感
      return {
        from_emotion: currentState.primary_emotion,
        to_emotion: currentState.primary_emotion,
        intensity_change: 0,
        trigger: eventType,
        timestamp: new Date(),
      };
    }

    // 计算最终影响
    let finalImpact = impact.impact;

    // 考虑生理状态的影响
    if (context?.physiologicalState) {
      const { hunger, fatigue, health } = context.physiologicalState;

      // 饥饿或疲劳会放大负面情感
      if (finalImpact < 0) {
        if (hunger < 30 || fatigue > 70) {
          finalImpact *= 1.5;
        }
      }

      // 健康状况差会减少正面情感
      if (finalImpact > 0 && health < 50) {
        finalImpact *= 0.7;
      }
    }

    // 应用强度修正
    if (context?.intensity) {
      finalImpact *= context.intensity / 50;
    }

    // 确定目标情感
    const targetEmotions = impact.target_emotions || ['joy'];
    const primaryTarget = targetEmotions[0];

    // 计算新的情感强度
    let newIntensity = currentState.emotion_intensity;

    if (finalImpact > 0) {
      newIntensity = Math.min(100, newIntensity + Math.abs(finalImpact));
    } else {
      newIntensity = Math.max(0, newIntensity - Math.abs(finalImpact));
    }

    // 计算压力变化
    let newStress = currentState.stress_level;
    if (finalImpact < 0) {
      newStress = Math.min(100, newStress + Math.abs(finalImpact) * 0.5);
    } else {
      newStress = Math.max(0, newStress - Math.abs(finalImpact) * 0.3);
    }

    // 计算快乐度变化
    let newHappiness = currentState.happiness_level;
    if (finalImpact > 0) {
      newHappiness = Math.min(100, newHappiness + Math.abs(finalImpact) * 0.8);
    } else {
      newHappiness = Math.max(0, newHappiness - Math.abs(finalImpact) * 0.6);
    }

    return {
      from_emotion: currentState.primary_emotion,
      to_emotion: primaryTarget,
      intensity_change: newIntensity - currentState.emotion_intensity,
      trigger: eventType,
      timestamp: new Date(),
    };
  }

  /**
   * 处理混合情感
   * 当两种情感同时存在时，计算主导情感
   */
  resolveMixedEmotions(
    primaryEmotion: PrimaryEmotion,
    secondaryEmotion: PrimaryEmotion | undefined,
    intensity: number
  ): PrimaryEmotion {
    if (!secondaryEmotion) {
      return primaryEmotion;
    }

    // 检查是否可以组合
    const comboKey1 = `${primaryEmotion}+${secondaryEmotion}`;
    const comboKey2 = `${secondaryEmotion}+${primaryEmotion}`;

    if (EMOTION_COMBINATIONS[comboKey1]) {
      return EMOTION_COMBINATIONS[comboKey1];
    }

    if (EMOTION_COMBINATIONS[comboKey2]) {
      return EMOTION_COMBINATIONS[comboKey2];
    }

    // 检查是否为对立情感
    if (EMOTION_OPPOSITES[primaryEmotion] === secondaryEmotion) {
      // 对立情感，强度高的获胜
      return primaryEmotion;
    }

    // 否则返回主要情感
    return primaryEmotion;
  }

  /**
   * 计算情感衰减
   */
  calculateEmotionDecay(currentState: EmotionalState): EmotionalState {
    const newIntensity = Math.max(
      20, // 基础情感强度
      currentState.emotion_intensity - EMOTION_DECAY_RATE
    );

    // 压力缓慢恢复
    const newStress = Math.max(0, currentState.stress_level - 1);

    // 快乐度缓慢衰减
    const newHappiness = Math.max(
      30, // 基础快乐度
      currentState.happiness_level - 1.5
    );

    return {
      ...currentState,
      emotion_intensity: newIntensity,
      stress_level: newStress,
      happiness_level: newHappiness,
    };
  }

  /**
   * 计算社交能量消耗
   */
  calculateSocialEnergyCost(
    currentEnergy: number,
    interactionType: 'chat' | 'deep_conversation' | 'argument' | 'group_activity'
  ): number {
    const baseCost = {
      chat: 5,
      deep_conversation: 15,
      argument: 25,
      group_activity: 10,
    };

    return Math.max(0, currentEnergy - baseCost[interactionType]);
  }

  /**
   * 计算社交能量恢复
   */
  calculateSocialEnergyRecovery(
    currentEnergy: number,
    recoveryType: 'rest' | 'meditation' | 'entertainment'
  ): number {
    const recoveryAmount = {
      rest: 5,
      meditation: 15,
      entertainment: 10,
    };

    return Math.min(100, currentEnergy + recoveryAmount[recoveryType]);
  }

  /**
   * 判断情感是否稳定
   */
  isEmotionStable(state: EmotionalState): boolean {
    // 情感稳定性基于情绪稳定性和情感强度
    return state.mood_stability > 50 && state.emotion_intensity < 80;
  }

  /**
   * 获取情感描述
   */
  getEmotionDescription(emotion: PrimaryEmotion, intensity: number): string {
    const descriptions: Record<PrimaryEmotion, string[]> = {
      joy: ['开心', '快乐', '愉悦', '狂喜'],
      trust: ['信任', '信赖', '深信不疑'],
      fear: ['担忧', '害怕', '恐惧', '惊恐'],
      surprise: ['惊讶', '吃惊', '震惊'],
      sadness: ['难过', '悲伤', '悲痛', '绝望'],
      disgust: ['厌恶', '反感', '憎恶'],
      anger: ['生气', '愤怒', '暴怒'],
      anticipation: ['期待', '盼望', '憧憬'],
      love: ['喜欢', '爱慕', '深爱'],
      optimism: ['乐观', '积极'],
      pessimism: ['悲观', '消极'],
      boredom: ['无聊', '厌倦'],
    };

    const emotionDescs = descriptions[emotion] || [emotion];
    const index = Math.min(
      emotionDescs.length - 1,
      Math.floor((intensity / 100) * emotionDescs.length)
    );

    return emotionDescs[index];
  }

  /**
   * 获取情感对应的表情符号
   */
  getEmotionEmoji(emotion: PrimaryEmotion): string {
    const emojis: Record<PrimaryEmotion, string> = {
      joy: '😊',
      trust: '🤝',
      fear: '😨',
      surprise: '😲',
      sadness: '😢',
      disgust: '🤢',
      anger: '😠',
      anticipation: '🤔',
      love: '❤️',
      optimism: '🌟',
      pessimism: '☁️',
      boredom: '😑',
    };

    return emojis[emotion] || '😐';
  }

  /**
   * 获取情感颜色代码（用于UI显示）
   */
  getEmotionColor(emotion: PrimaryEmotion): string {
    const colors: Record<PrimaryEmotion, string> = {
      joy: '#FFD700',      // 金色
      trust: '#87CEEB',    // 天蓝色
      fear: '#9370DB',     // 紫色
      surprise: '#FFA500', // 橙色
      sadness: '#4682B4',  // 钢蓝色
      disgust: '#808080',  // 灰色
      anger: '#DC143C',    // 深红色
      anticipation: '#20B2AA', // 绿松石色
      love: '#FF69B4',     // 粉红色
      optimism: '#32CD32', // 绿色
      pessimism: '#696969', // 暗灰色
      boredom: '#A9A9A9',  // 中灰色
    };

    return colors[emotion] || '#FFFFFF';
  }

  /**
   * 分析情感历史模式
   */
  analyzeEmotionPattern(history: EmotionRecord[]): {
    dominantEmotion: PrimaryEmotion;
    averageIntensity: number;
    emotionStability: number;
    commonTriggers: string[];
  } {
    if (history.length === 0) {
      return {
        dominantEmotion: 'neutral',
        averageIntensity: 50,
        emotionStability: 50,
        commonTriggers: [],
      };
    }

    // 统计每种情感出现的次数
    const emotionCounts: Record<string, number> = {};
    const triggerCounts: Record<string, number> = {};
    let totalIntensity = 0;

    for (const record of history) {
      emotionCounts[record.emotion] = (emotionCounts[record.emotion] || 0) + 1;
      triggerCounts[record.trigger] = (triggerCounts[record.trigger] || 0) + 1;
      totalIntensity += record.intensity;
    }

    // 找出主导情感
    const dominantEmotion = Object.entries(emotionCounts).sort(
      (a, b) => b[1] - a[1]
    )[0][0] as PrimaryEmotion;

    // 计算平均强度
    const averageIntensity = totalIntensity / history.length;

    // 计算情感稳定性（基于强度方差）
    const variance =
      history.reduce((sum, record) => {
        return sum + Math.pow(record.intensity - averageIntensity, 2);
      }, 0) / history.length;

    const emotionStability = Math.max(0, 100 - Math.sqrt(variance));

    // 找出常见触发因素
    const commonTriggers = Object.entries(triggerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map((entry) => entry[0]);

    return {
      dominantEmotion,
      averageIntensity,
      emotionStability,
      commonTriggers,
    };
  }

  /**
   * 预测情感趋势
   */
  predictEmotionTrend(
    currentState: EmotionalState,
    history: EmotionRecord[]
  ): {
    predictedEmotion: PrimaryEmotion;
    confidence: number;
    reasoning: string;
  } {
    if (history.length < 5) {
      return {
        predictedEmotion: currentState.primary_emotion,
        confidence: 0.5,
        reasoning: 'Not enough history data',
      };
    }

    // 获取最近的情感记录
    const recentHistory = history.slice(-10);

    // 分析趋势
    const pattern = this.analyzeEmotionPattern(recentHistory);

    // 如果情感稳定性高，预测情感保持不变
    if (currentState.mood_stability > 70) {
      return {
        predictedEmotion: currentState.primary_emotion,
        confidence: 0.8,
        reasoning: 'High mood stability suggests emotion will persist',
      };
    }

    // 如果压力水平高，预测转向负面情感
    if (currentState.stress_level > 70) {
      return {
        predictedEmotion: 'fear',
        confidence: 0.7,
        reasoning: 'High stress level may lead to anxiety',
      };
    }

    // 如果快乐度高，预测保持正面情感
    if (currentState.happiness_level > 70) {
      return {
        predictedEmotion: 'joy',
        confidence: 0.75,
        reasoning: 'High happiness level suggests positive emotions',
      };
    }

    return {
      predictedEmotion: pattern.dominantEmotion,
      confidence: 0.6,
      reasoning: 'Based on historical emotion patterns',
    };
  }
}

export const emotionEngine = EmotionEngine.getInstance();
