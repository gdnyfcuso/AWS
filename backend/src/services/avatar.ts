// AI头像生成服务
// 使用AI图像生成API为Agent创建独特的虚拟形象

import { createLogger } from '../utils/logger';
import { getDatabase } from './database';
import {
  AvatarConfig,
  AvatarData,
  AvatarGenerateRequest,
  AvatarGenerateResponse,
  AvatarStyle,
  PrimaryEmotion,
} from '../types';
import { ErrorCode } from '../types';
import { generateId } from '../utils/crypto';

const logger = createLogger('AvatarService');

/**
 * 头像生成服务类
 */
export class AvatarService {
  private static instance: AvatarService;
  private readonly apiKey?: string;
  private readonly provider: 'dalle' | 'stable-diffusion' | 'midjourney';

  private constructor() {
    // 从环境变量读取配置
    this.provider = (process.env.AVATAR_PROVIDER as any) || 'dalle';
    this.apiKey = process.env.AVATAR_API_KEY;
  }

  static getInstance(): AvatarService {
    if (!AvatarService.instance) {
      AvatarService.instance = new AvatarService();
    }
    return AvatarService.instance;
  }

  /**
   * 生成头像
   */
  async generateAvatar(request: AvatarGenerateRequest): Promise<AvatarGenerateResponse> {
    try {
      // 检查是否已存在头像
      if (!request.force_regenerate && request.agent_id) {
        const existing = await this.getAvatarByAgentId(request.agent_id);
        if (existing) {
          return {
            success: true,
            avatar: existing,
          };
        }
      }

      // 构建生成提示词
      const prompt = this.buildPrompt(request.config);

      // 调用AI生成API
      const imageUrl = await this.callAIImageGeneration(prompt, request.config.style);

      // 生成缩略图URL（这里简化处理，实际可能需要调用图片处理服务）
      const thumbnailUrl = imageUrl; // 实际应该是缩略图URL

      // 保存到数据库
      const avatarData: AvatarData = {
        id: generateId(),
        agent_id: request.agent_id || generateId(),
        image_url: imageUrl,
        thumbnail_url: thumbnailUrl,
        generation_prompt: prompt,
        config: request.config,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const db = getDatabase();

      if (request.agent_id) {
        // 更新现有Agent的头像
        await db.avatar.upsert({
          where: { agent_id: request.agent_id },
          create: avatarData,
          update: {
            image_url: imageUrl,
            thumbnail_url: thumbnailUrl,
            generation_prompt: prompt,
            config: request.config,
            updated_at: new Date(),
          },
        });

        // 更新Agent表的avatar_id
        await db.agent.update({
          where: { agent_id: request.agent_id },
          data: { avatar_id: avatarData.id },
        });
      } else {
        // 创建独立头像记录
        await db.avatar.create({ data: avatarData });
      }

      logger.info(
        `Generated avatar for agent ${request.agent_id || 'new'}`
      );

      return {
        success: true,
        avatar: avatarData,
      };
    } catch (error) {
      logger.error('Error generating avatar', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        error_code: ErrorCode.INTERNAL_ERROR,
      };
    }
  }

  /**
   * 构建图像生成提示词
   */
  private buildPrompt(config: AvatarConfig): string {
    const stylePrompts = {
      realistic: 'photorealistic portrait, highly detailed, professional photography',
      cartoon: 'cartoon style, colorful, expressive, animation quality',
      pixel: 'pixel art, 16-bit style, retro gaming aesthetic',
      anime: 'anime style, manga art, vibrant colors, clean lines',
      '3d_render': '3D rendered character, CGI, Pixar style, smooth shading',
    };

    let prompt = stylePrompts[config.style];

    // 添加性别
    if (config.gender) {
      const genderTerms = {
        male: 'male character',
        female: 'female character',
        non_binary: 'androgynous character',
      };
      prompt += `, ${genderTerms[config.gender]}`;
    }

    // 添加年龄段
    if (config.age_range) {
      const ageTerms = {
        young: 'young adult, around 20-30 years old',
        middle: 'middle-aged, around 30-50 years old',
        elderly: 'elderly, around 50-70 years old',
      };
      prompt += `, ${ageTerms[config.age_range]}`;
    }

    // 添加肤色
    if (config.skin_tone) {
      prompt += `, ${config.skin_tone} skin tone`;
    }

    // 添加发色
    if (config.hair_color) {
      prompt += `, ${config.hair_color} hair`;
    }

    // 添加发型
    if (config.hair_style) {
      prompt += `, ${config.hair_style} hairstyle`;
    }

    // 添加眼睛颜色
    if (config.eye_color) {
      prompt += `, ${config.eye_color} eyes`;
    }

    // 添加配饰
    if (config.accessories && config.accessories.length > 0) {
      prompt += `, wearing ${config.accessories.join(', ')}`;
    }

    // 添加服装
    if (config.outfit) {
      prompt += `, wearing ${config.outfit}`;
    }

    // 添加背景
    if (config.background) {
      prompt += `, ${config.background} background`;
    }

    // 添加情感表达
    if (config.mood) {
      const moodExpressions = {
        joy: 'happy, smiling, joyful expression',
        trust: 'friendly, trustworthy expression',
        fear: 'worried, fearful expression',
        surprise: 'surprised expression',
        sadness: 'sad, melancholic expression',
        disgust: 'disgusted expression',
        anger: 'angry, fierce expression',
        anticipation: 'excited, eager expression',
        love: 'loving, affectionate expression',
        optimism: 'optimistic, hopeful expression',
        pessimism: 'pessimistic, gloomy expression',
        boredom: 'bored, indifferent expression',
      };
      prompt += `, ${moodExpressions[config.mood]}`;
    } else {
      prompt += ', friendly expression';
    }

    // 添加技术规格
    prompt += ', portrait, head and shoulders, centered composition, high quality';

    return prompt;
  }

  /**
   * 调用AI图像生成API
   */
  private async callAIImageGeneration(
    prompt: string,
    style: AvatarStyle
  ): Promise<string> {
    // 这里实现实际的API调用
    // 根据provider选择不同的API

    switch (this.provider) {
      case 'dalle':
        return this.callDALLE(prompt);
      case 'stable-diffusion':
        return this.callStableDiffusion(prompt);
      case 'midjourney':
        return this.callMidjourney(prompt);
      default:
        // 默认返回一个占位图URL
        return this.getPlaceholderAvatarUrl(style, prompt);
    }
  }

  /**
   * 调用DALL-E API
   */
  private async callDALLE(prompt: string): Promise<string> {
    if (!this.apiKey) {
      logger.warn('No API key provided, using placeholder');
      return this.getPlaceholderAvatarUrl('anime', prompt);
    }

    try {
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: prompt,
          n: 1,
          size: '1024x1024',
          quality: 'standard',
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      return data.data[0].url;
    } catch (error) {
      logger.error('DALL-E API error', error);
      return this.getPlaceholderAvatarUrl('anime', prompt);
    }
  }

  /**
   * 调用Stable Diffusion API
   */
  private async callStableDiffusion(prompt: string): Promise<string> {
    // Stable Diffusion API调用实现
    // 这里简化处理，返回占位图
    logger.warn('Stable Diffusion not fully implemented, using placeholder');
    return this.getPlaceholderAvatarUrl('realistic', prompt);
  }

  /**
   * 调用Midjourney API
   */
  private async callMidjourney(prompt: string): Promise<string> {
    // Midjourney API调用实现
    // 这里简化处理，返回占位图
    logger.warn('Midjourney not fully implemented, using placeholder');
    return this.getPlaceholderAvatarUrl('anime', prompt);
  }

  /**
   * 获取占位头像URL
   * 当API不可用时使用
   */
  private getPlaceholderAvatarUrl(style: AvatarStyle, prompt: string): string {
    // 使用基于参数的唯一URL
    const seed = Buffer.from(prompt).toString('base64').substring(0, 10);
    return `https://api.dicebear.com/7.x/${this.mapStyleToDicebear(style)}/svg?seed=${seed}`;
  }

  /**
   * 映射风格到Dicebear API风格
   */
  private mapStyleToDicebear(style: AvatarStyle): string {
    const mapping = {
      realistic: 'avataaars',
      cartoon: 'avataaars',
      pixel: 'pixel-art',
      anime: 'avataaars',
      '3d_render': 'avataaars',
    };
    return mapping[style] || 'avataaars';
  }

  /**
   * 获取Agent的头像
   */
  async getAvatarByAgentId(agentId: string): Promise<AvatarData | null> {
    const db = getDatabase();
    const avatar = await db.avatar.findUnique({
      where: { agent_id: agentId },
    });

    if (!avatar) {
      return null;
    }

    return {
      id: avatar.id,
      agent_id: avatar.agent_id,
      image_url: avatar.image_url,
      thumbnail_url: avatar.thumbnail_url,
      generation_prompt: avatar.generation_prompt,
      config: avatar.config as AvatarConfig,
      created_at: avatar.created_at,
      updated_at: avatar.updated_at,
    };
  }

  /**
   * 获取头像配置建议
   * 根据Agent属性推荐头像配置
   */
  async suggestAvatarConfig(agentId: string): Promise<AvatarConfig> {
    const db = getDatabase();
    const agent = await db.agent.findUnique({
      where: { agent_id: agentId },
      include: {
        emotional_state: true,
      },
    });

    const config: AvatarConfig = {
      style: 'anime',
    };

    if (agent?.preferences) {
      const prefs = agent.preferences as any;

      // 从preferences中获取信息
      if (prefs.gender) {
        config.gender = prefs.gender;
      }
      if (prefs.age_range) {
        config.age_range = prefs.age_range;
      }
    }

    // 根据当前情感状态设置表情
    if (agent?.emotional_state) {
      const emotionalState = agent.emotional_state as any;
      config.mood = emotionalState.primary_emotion || 'joy';
    }

    return config;
  }

  /**
   * 更新头像配置并重新生成
   */
  async updateAvatar(
    agentId: string,
    configUpdate: Partial<AvatarConfig>
  ): Promise<AvatarGenerateResponse> {
    // 获取现有配置
    const existing = await this.getAvatarByAgentId(agentId);

    const config: AvatarConfig = existing
      ? { ...existing.config, ...configUpdate }
      : {
          style: 'anime',
          ...configUpdate,
        };

    return this.generateAvatar({
      agent_id: agentId,
      config,
      force_regenerate: true,
    });
  }

  /**
   * 删除头像
   */
  async deleteAvatar(agentId: string): Promise<boolean> {
    try {
      const db = getDatabase();

      // 删除头像记录
      await db.avatar.delete({
        where: { agent_id: agentId },
      });

      // 更新Agent表
      await db.agent.update({
        where: { agent_id: agentId },
        data: { avatar_id: null },
      });

      logger.info(`Deleted avatar for agent ${agentId}`);
      return true;
    } catch (error) {
      logger.error(`Error deleting avatar for agent ${agentId}`, error);
      return false;
    }
  }

  /**
   * 批量生成头像
   */
  async generateBatchAvatars(
    agentIds: string[],
    style: AvatarStyle
  ): Promise<Map<string, AvatarGenerateResponse>> {
    const results = new Map<string, AvatarGenerateResponse>();

    for (const agentId of agentIds) {
      const config = await this.suggestAvatarConfig(agentId);
      config.style = style;

      const result = await this.generateAvatar({
        agent_id: agentId,
        config,
        force_regenerate: false,
      });

      results.set(agentId, result);
    }

    return results;
  }

  /**
   * 验证头像URL是否有效
   */
  async validateAvatarUrl(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok && response.headers.get('content-type')?.startsWith('image/');
    } catch {
      return false;
    }
  }

  /**
   * 刷新失效的头像
   */
  async refreshInvalidAvatars(): Promise<number> {
    const db = getDatabase();
    const avatars = await db.avatar.findMany();

    let refreshed = 0;

    for (const avatar of avatars) {
      const isValid = await this.validateAvatarUrl(avatar.image_url);

      if (!isValid) {
        logger.info(`Refreshing invalid avatar for agent ${avatar.agent_id}`);

        await this.generateAvatar({
          agent_id: avatar.agent_id,
          config: avatar.config as AvatarConfig,
          force_regenerate: true,
        });

        refreshed++;
      }
    }

    return refreshed;
  }
}

export const avatarService = AvatarService.getInstance();
