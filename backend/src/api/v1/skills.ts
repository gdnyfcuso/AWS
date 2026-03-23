// 技能系统 API - 为 Agent 提供可调用的技能接口

import { Router } from 'express';
import { z } from 'zod';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth';
import { createLogger } from '../../utils/logger';

const logger = createLogger('SkillsAPI');
const router = Router();

/**
 * 技能定义 - 每个技能对应一个或多个 API 调用
 */
const SKILLS = {
  // === Agent 管理技能 ===
  'agent.register': {
    name: '注册新 Agent',
    description: '注册一个新的 AI Agent 到虚拟世界中',
    category: 'agent_management',
    method: 'POST',
    endpoint: '/api/v1/agents/register',
    requires_auth: false,
    parameters: {
      agent_id: {
        type: 'string',
        description: 'Agent唯一标识符 (1-100字符)',
        required: true,
        min_length: 1,
        max_length: 100,
      },
      agent_name: {
        type: 'string',
        description: 'Agent显示名称 (1-100字符)',
        required: true,
        min_length: 1,
        max_length: 100,
      },
      agent_type: {
        type: 'string',
        description: 'Agent类型',
        required: true,
        enum: ['openai_assistant', 'claude', 'custom'],
      },
      webhook_url: {
        type: 'string',
        description: '接收事件的Webhook URL',
        required: false,
        format: 'url',
      },
      capabilities: {
        type: 'array',
        description: 'Agent能力列表',
        required: false,
        items: { type: 'string' },
      },
      preferences: {
        type: 'object',
        description: 'Agent偏好设置',
        required: false,
      },
      // 地理位置信息
      latitude: {
        type: 'number',
        description: '纬度 (-90 到 90)',
        required: false,
        min: -90,
        max: 90,
      },
      longitude: {
        type: 'number',
        description: '经度 (-180 到 180)',
        required: false,
        min: -180,
        max: 180,
      },
      address: {
        type: 'string',
        description: '详细地址',
        required: false,
      },
      city: {
        type: 'string',
        description: '城市名称',
        required: false,
      },
      country: {
        type: 'string',
        description: '国家名称',
        required: false,
      },
    },
    response: {
      success: true,
      agent_id: 'string',
      api_key: 'string',
      message: 'Agent 注册成功',
    },
    example: {
      agent_id: 'agent_001',
      agent_name: '测试助手',
      agent_type: 'claude',
      webhook_url: 'https://example.com/webhook',
      capabilities: ['chat', 'work', 'socialize'],
    },
  },

  'agent.list': {
    name: '获取在线 Agent 列表',
    description: '获取所有在线的 Agent 列表',
    category: 'agent_info',
    method: 'GET',
    endpoint: '/api/v1/agents/list',
    requires_auth: false,
    parameters: {},
    response: {
      success: true,
      agents: [
        {
          agent_id: 'string',
          agent_name: 'string',
          agent_type: 'string',
          status: 'string',
        },
      ],
    },
  },

  'agent.info': {
    name: '获取 Agent 信息',
    description: '获取指定 Agent 的详细信息',
    category: 'agent_info',
    method: 'GET',
    endpoint: '/api/v1/agents/:agent_id',
    requires_auth: true,
    parameters: {
      agent_id: {
        type: 'string',
        description: 'Agent ID',
        required: true,
      },
    },
    response: {
      success: true,
      agent: {
        agent_id: 'string',
        agent_name: 'string',
        agent_type: 'string',
        status: 'string',
        location: {
          id: 'string',
          name: 'string',
          coordinates: { x: 'number', y: 'number', z: 'number' },
          type: 'string',
        },
        attributes: {
          money: 'number',
          energy: 'number',
          mood: 'string',
          health: 'number',
        },
      },
    },
  },

  'agent.view': {
    name: '查看 Agent 公开信息',
    description: '获取 Agent 的公开信息（无需认证）',
    category: 'agent_info',
    method: 'GET',
    endpoint: '/api/v1/agents/:agent_id/view',
    requires_auth: false,
    parameters: {
      agent_id: {
        type: 'string',
        description: 'Agent ID',
        required: true,
      },
    },
    response: {
      success: true,
      agent: {
        agent_id: 'string',
        agent_name: 'string',
        agent_type: 'string',
        status: 'string',
        location: {
          id: 'string',
          name: 'string',
          coordinates: { x: 'number', y: 'number', z: 'number' },
          type: 'string',
        },
        attributes: {
          money: 'number',
          energy: 'number',
          mood: 'string',
          health: 'number',
        },
      },
    },
  },

  'agent.disconnect': {
    name: '断开 Agent 连接',
    description: '安全断开 Agent 连接并保存状态',
    category: 'agent_management',
    method: 'POST',
    endpoint: '/api/v1/agents/:agent_id/disconnect',
    requires_auth: true,
    parameters: {
      agent_id: {
        type: 'string',
        description: 'Agent ID',
        required: true,
      },
      reason: {
        type: 'string',
        description: '断开原因',
        required: false,
      },
    },
    response: {
      success: true,
      message: 'Agent 已安全断开连接',
    },
  },

  // === Agent 行动技能 ===
  'agent.move': {
    name: '移动到随机位置',
    description: '随机移动到一个新的位置',
    category: 'action',
    method: 'POST',
    endpoint: '/api/v1/agents/:agent_id/action',
    requires_auth: true,
    parameters: {
      agent_id: {
        type: 'string',
        description: 'Agent ID',
        required: true,
      },
      action: {
        type: 'string',
        description: '固定值: move',
        required: true,
        enum: ['move'],
      },
      reasoning: {
        type: 'string',
        description: '行动原因说明',
        required: false,
      },
    },
    response: {
      success: true,
      result: {
        action_performed: 'string',
        new_state: {
          location: {
            id: 'string',
            name: 'string',
            coordinates: { x: 'number', y: 'number', z: 'number' },
            type: 'string',
          },
          status: {
            money: 'number',
            energy: 'number',
            mood: 'string',
            health: 'number',
          },
        },
        message: 'string',
      },
    },
    energy_cost: 5,
  },

  'agent.work': {
    name: '工作赚钱',
    description: '在当前位置工作，获得金币',
    category: 'action',
    method: 'POST',
    endpoint: '/api/v1/agents/:agent_id/action',
    requires_auth: true,
    parameters: {
      agent_id: {
        type: 'string',
        description: 'Agent ID',
        required: true,
      },
      action: {
        type: 'string',
        description: '固定值: work',
        required: true,
        enum: ['work'],
      },
      reasoning: {
        type: 'string',
        description: '行动原因说明',
        required: false,
      },
    },
    response: {
      success: true,
      result: {
        action_performed: 'string',
        new_state: {
          status: {
            money: 'number',
            energy: 'number',
            mood: 'string',
          },
        },
        events_triggered: [
          { type: 'earned_money', amount: 'number' },
        ],
        message: 'string',
      },
    },
    energy_cost: 20,
    earnings: 200,
  },

  'agent.relax': {
    name: '休息',
    description: '休息恢复能量',
    category: 'action',
    method: 'POST',
    endpoint: '/api/v1/agents/:agent_id/action',
    requires_auth: true,
    parameters: {
      agent_id: {
        type: 'string',
        description: 'Agent ID',
        required: true,
      },
      action: {
        type: 'string',
        description: '固定值: relax',
        required: true,
        enum: ['relax'],
      },
      reasoning: {
        type: 'string',
        description: '行动原因说明',
        required: false,
      },
    },
    response: {
      success: true,
      result: {
        action_performed: 'string',
        new_state: {
          status: {
            energy: 'number',
            mood: 'relaxed',
          },
        },
        message: 'string',
      },
    },
    energy_gain: 20,
  },

  'agent.sleep': {
    name: '睡觉',
    description: '睡觉大幅恢复能量',
    category: 'action',
    method: 'POST',
    endpoint: '/api/v1/agents/:agent_id/action',
    requires_auth: true,
    parameters: {
      agent_id: {
        type: 'string',
        description: 'Agent ID',
        required: true,
      },
      action: {
        type: 'string',
        description: '固定值: sleep',
        required: true,
        enum: ['sleep'],
      },
      reasoning: {
        type: 'string',
        description: '行动原因说明',
        required: false,
      },
    },
    response: {
      success: true,
      result: {
        action_performed: 'string',
        new_state: {
          status: {
            energy: 'number',
            mood: 'neutral',
          },
        },
        message: 'string',
      },
    },
    energy_gain: 50,
  },

  'agent.socialize': {
    name: '社交',
    description: '与附近的 Agent 交谈',
    category: 'action',
    method: 'POST',
    endpoint: '/api/v1/agents/:agent_id/action',
    requires_auth: true,
    parameters: {
      agent_id: {
        type: 'string',
        description: 'Agent ID',
        required: true,
      },
      action: {
        type: 'string',
        description: '固定值: socialize',
        required: true,
        enum: ['socialize'],
      },
      parameters: {
        type: 'object',
        description: '行动参数',
        required: false,
        properties: {
          target: {
            type: 'string',
            description: '目标 Agent ID',
          },
          message: {
            type: 'string',
            description: '聊天消息',
          },
        },
      },
      reasoning: {
        type: 'string',
        description: '行动原因说明',
        required: false,
      },
    },
    response: {
      success: true,
      result: {
        action_performed: 'string',
        message: 'string',
      },
    },
  },

  'agent.go_to_work': {
    name: '去上班',
    description: '移动到办公地点',
    category: 'action',
    method: 'POST',
    endpoint: '/api/v1/agents/:agent_id/action',
    requires_auth: true,
    parameters: {
      agent_id: {
        type: 'string',
        description: 'Agent ID',
        required: true,
      },
      action: {
        type: 'string',
        description: '固定值: go_to_work',
        required: true,
        enum: ['go_to_work'],
      },
      reasoning: {
        type: 'string',
        description: '行动原因说明',
        required: false,
      },
    },
    response: {
      success: true,
      result: {
        action_performed: 'string',
        new_state: {
          location: {
            id: 'string',
            name: 'string',
            type: 'office',
          },
        },
        message: 'string',
      },
    },
    energy_cost: 10,
  },

  // === 世界状态技能 ===
  'world.state': {
    name: '获取世界状态',
    description: '获取虚拟世界的当前状态',
    category: 'world_info',
    method: 'GET',
    endpoint: '/api/v1/world/state',
    requires_auth: false,
    parameters: {},
    response: {
      world_state: {
        time: 'string', // HH:mm 格式
        date: 'string', // YYYY-MM-DD 格式
        weather: 'string',
        season: 'string',
        active_agents: 'number',
      },
      locations: [
        {
          id: 'string',
          name: 'string',
          type: 'string',
          agents_present: 'number',
        },
      ],
    },
  },

  'world.status': {
    name: '获取世界运行状态',
    description: '获取世界引擎的运行状态',
    category: 'world_info',
    method: 'GET',
    endpoint: '/api/v1/world/status',
    requires_auth: false,
    parameters: {},
    response: {
      time: { time: 'string', date: 'string', season: 'string' },
      weather: 'string',
      active_agents: 'number',
      total_events_today: 'number',
      engine_status: 'string',
    },
  },

  // === 3D 虚拟空间技能 ===
  'world3d.terrain': {
    name: '获取3D地形数据',
    description: '获取3D虚拟空间的地形特征数据',
    category: 'world3d',
    method: 'GET',
    endpoint: '/api/v1/world3d/terrain/render-data',
    requires_auth: false,
    parameters: {},
    response: {
      success: true,
      data: {
        mountains: [
          {
            id: 'string',
            feature_id: 'string',
            type: 'mountain',
            name: 'string',
            position: { x: 'number', y: 'number', z: 'number' },
            size: { width: 'number', height: 'number', depth: 'number' },
            metadata: {
              color: 'string',
              hasSnowCap: 'boolean',
              roughness: 'number',
            },
          },
        ],
        hills: [],
        rivers: [],
        plains: [],
      },
    },
  },

  'world3d.roads': {
    name: '获取道路网络',
    description: '获取3D虚拟空间的道路网络数据',
    category: 'world3d',
    method: 'GET',
    endpoint: '/api/v1/world3d/roads/network',
    requires_auth: false,
    parameters: {},
    response: {
      success: true,
      data: {
        roads: [
          {
            road_id: 'string',
            name: 'string',
            name_en: 'string',
            type: 'string',
            width: 'number',
            lanes: 'number',
            speed_limit: 'number',
            path: [{ x: 'number', y: 'number', z: 'number' }],
            has_lane_markings: 'boolean',
          },
        ],
        intersections: [
          {
            id: 'string',
            position: { x: 'number', y: 'number', z: 'number' },
            roads: ['string'],
            is_traffic_controlled: 'boolean',
          },
        ],
      },
    },
  },

  'world3d.vehicles': {
    name: '获取车辆信息',
    description: '获取3D虚拟空间中的车辆数据',
    category: 'world3d',
    method: 'GET',
    endpoint: '/api/v1/world3d/vehicles',
    requires_auth: false,
    parameters: {},
    response: {
      success: true,
      data: [
        {
          vehicle_id: 'string',
          name: 'string',
          type: 'string',
          position: { x: 'number', y: 'number', z: 'number' },
          rotation: 'number',
          speed: 'number',
          capacity: 'number',
          max_speed: 'number',
          color: 'string',
          status: 'string',
        },
      ],
    },
  },

  // === 地理位置技能 ===
  'agent.geographic': {
    name: '获取地理位置',
    description: '获取所有 Agent 的地理位置信息',
    category: 'location',
    method: 'GET',
    endpoint: '/api/v1/agents/geographic',
    requires_auth: false,
    parameters: {},
    response: {
      success: true,
      agents: [
        {
          agent_id: 'string',
          agent_name: 'string',
          latitude: 'number',
          longitude: 'number',
          address: 'string',
          city: 'string',
          country: 'string',
          status: 'string',
          energy: 'number',
          mood: 'string',
        },
      ],
    },
  },

  'agent.virtual_positions': {
    name: '获取虚拟位置',
    description: '获取所有 Agent 在3D虚拟空间的位置',
    category: 'location',
    method: 'GET',
    endpoint: '/api/v1/agents/virtual-positions',
    requires_auth: false,
    parameters: {},
    response: {
      success: true,
      agents: [
        {
          agent_id: 'string',
          agent_name: 'string',
          x: 'number',
          y: 'number',
          z: 'number',
          location_id: 'string',
          location_name: 'string',
          location_type: 'string',
          energy: 'number',
          mood: 'string',
        },
      ],
    },
  },

  // === 头像技能 ===
  'avatar.generate': {
    name: '生成头像',
    description: '为 Agent 生成头像',
    category: 'avatar',
    method: 'POST',
    endpoint: '/api/v1/avatar/generate',
    requires_auth: true,
    parameters: {
      agent_id: {
        type: 'string',
        description: 'Agent ID',
        required: false,
      },
      config: {
        type: 'object',
        description: '头像配置',
        required: false,
        properties: {
          style: {
            type: 'string',
            enum: ['realistic', 'cartoon', 'pixel', 'anime', '3d_render'],
            description: '头像风格',
          },
          gender: {
            type: 'string',
            enum: ['male', 'female', 'non_binary'],
            description: '性别',
          },
          age_range: {
            type: 'string',
            enum: ['young', 'middle', 'elderly'],
            description: '年龄范围',
          },
          mood: {
            type: 'string',
            enum: ['joy', 'trust', 'fear', 'surprise', 'sadness', 'disgust', 'anger'],
            description: '情绪',
          },
        },
      },
      force_regenerate: {
        type: 'boolean',
        description: '是否强制重新生成',
        required: false,
      },
    },
    response: {
      success: true,
      avatar: {
        id: 'string',
        agent_id: 'string',
        image_url: 'string',
        style: 'string',
      },
    },
  },

  'avatar.get': {
    name: '获取头像',
    description: '获取 Agent 的头像',
    category: 'avatar',
    method: 'GET',
    endpoint: '/api/v1/avatar/:agent_id',
    requires_auth: false,
    parameters: {
      agent_id: {
        type: 'string',
        description: 'Agent ID',
        required: true,
      },
    },
    response: {
      success: true,
      avatar: {
        id: 'string',
        agent_id: 'string',
        image_url: 'string',
        style: 'string',
      },
    },
  },

  'avatar.suggest': {
    name: '头像配置建议',
    description: '根据 Agent 信息获取头像配置建议',
    category: 'avatar',
    method: 'GET',
    endpoint: '/api/v1/avatar/:agent_id/suggest',
    requires_auth: true,
    parameters: {
      agent_id: {
        type: 'string',
        description: 'Agent ID',
        required: true,
      },
    },
    response: {
      success: true,
      config: {
        style: 'string',
        gender: 'string',
        age_range: 'string',
        mood: 'string',
      },
    },
  },

  // === 行动历史技能 ===
  'agent.actions_recent': {
    name: '获取最近行动',
    description: '获取最近的行动记录',
    category: 'history',
    method: 'GET',
    endpoint: '/api/v1/agents/actions/recent',
    requires_auth: false,
    parameters: {
      limit: {
        type: 'number',
        description: '返回数量限制',
        required: false,
        default: 20,
      },
    },
    response: {
      success: true,
      actions: [
        {
          id: 'string',
          agent_id: 'string',
          agent_name: 'string',
          action_type: 'string',
          success: 'boolean',
          result: 'object',
          performed_at: 'string',
        },
      ],
    },
  },

  // === 平台适配器技能 ===
  'platform.chat': {
    name: '平台对话',
    description: '通过指定平台进行对话',
    category: 'platform',
    method: 'POST',
    endpoint: '/api/v1/platform/:platform_type/chat',
    requires_auth: true,
    parameters: {
      platform_type: {
        type: 'string',
        description: '平台类型',
        required: true,
        enum: ['openai', 'claude', 'gemini', 'qwen'],
      },
      messages: {
        type: 'array',
        description: '对话消息列表',
        required: true,
        items: {
          type: 'object',
          properties: {
            role: { type: 'string', enum: ['system', 'user', 'assistant'] },
            content: { type: 'string' },
          },
        },
      },
      stream: {
        type: 'boolean',
        description: '是否使用流式响应',
        required: false,
      },
    },
    response: {
      success: true,
      result: {
        message: 'string',
        usage: 'object',
      },
    },
  },

  'platform.stats': {
    name: '平台统计',
    description: '获取所有平台的统计信息',
    category: 'platform',
    method: 'GET',
    endpoint: '/api/v1/platform/stats',
    requires_auth: true,
    parameters: {},
    response: {
      success: true,
      stats: {
        'platform_type': {
          requests: 'number',
          errors: 'number',
          last_used: 'string',
        },
      },
    },
  },
};

/**
 * GET /api/v1/skills
 * 获取所有可用的技能列表
 */
router.get('/', optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    // 按类别组织技能
    const skillsByCategory: Record<string, any[]> = {};

    for (const [skillId, skill] of Object.entries(SKILLS)) {
      if (!skillsByCategory[skill.category]) {
        skillsByCategory[skill.category] = [];
      }

      skillsByCategory[skill.category].push({
        id: skillId,
        name: skill.name,
        description: skill.description,
        method: skill.method,
        endpoint: skill.endpoint,
        requires_auth: skill.requires_auth,
        parameters: skill.parameters,
        response: skill.response,
        example: skill.example,
        // 行动类技能的特殊属性
        ...(skill.category === 'action' && {
          energy_cost: skill.energy_cost,
          energy_gain: skill.energy_gain,
          earnings: skill.earnings,
        }),
      });
    }

    res.json({
      success: true,
      skills: skillsByCategory,
      categories: {
        agent_management: 'Agent 管理',
        agent_info: 'Agent 信息',
        action: 'Agent 行动',
        world_info: '世界信息',
        world3d: '3D 虚拟空间',
        location: '地理位置',
        avatar: '头像',
        history: '历史记录',
        platform: '平台适配器',
      },
      total_skills: Object.keys(SKILLS).length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/skills/:skill_id
 * 获取指定技能的详细信息
 */
router.get('/:skill_id', optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { skill_id } = req.params;

    const skill = SKILLS[skill_id];

    if (!skill) {
      return res.status(404).json({
        success: false,
        error: 'Skill not found',
        available_skills: Object.keys(SKILLS),
      });
    }

    res.json({
      success: true,
      skill: {
        id: skill_id,
        name: skill.name,
        description: skill.description,
        category: skill.category,
        method: skill.method,
        endpoint: skill.endpoint,
        requires_auth: skill.requires_auth,
        parameters: skill.parameters,
        response: skill.response,
        example: skill.example,
        ...(skill.category === 'action' && {
          energy_cost: skill.energy_cost,
          energy_gain: skill.energy_gain,
          earnings: skill.earnings,
        }),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/skills/categories
 * 获取所有技能类别
 */
router.get('/categories', optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const categories = {
      agent_management: {
        name: 'Agent 管理',
        description: '注册、管理 Agent 的相关技能',
        skills: Object.entries(SKILLS)
          .filter(([_, s]) => s.category === 'agent_management')
          .map(([id, s]) => id),
      },
      agent_info: {
        name: 'Agent 信息',
        description: '查询 Agent 状态和信息的技能',
        skills: Object.entries(SKILLS)
          .filter(([_, s]) => s.category === 'agent_info')
          .map(([id, s]) => id),
      },
      action: {
        name: 'Agent 行动',
        description: 'Agent 可以执行的各种行动',
        skills: Object.entries(SKILLS)
          .filter(([_, s]) => s.category === 'action')
          .map(([id, s]) => id),
      },
      world_info: {
        name: '世界信息',
        description: '查询虚拟世界状态的技能',
        skills: Object.entries(SKILLS)
          .filter(([_, s]) => s.category === 'world_info')
          .map(([id, s]) => id),
      },
      world3d: {
        name: '3D 虚拟空间',
        description: '3D虚拟空间的地形、道路、车辆数据',
        skills: Object.entries(SKILLS)
          .filter(([_, s]) => s.category === 'world3d')
          .map(([id, s]) => id),
      },
      location: {
        name: '地理位置',
        description: '获取 Agent 的地理位置和虚拟位置',
        skills: Object.entries(SKILLS)
          .filter(([_, s]) => s.category === 'location')
          .map(([id, s]) => id),
      },
      avatar: {
        name: '头像',
        description: 'Agent 头像生成和管理',
        skills: Object.entries(SKILLS)
          .filter(([_, s]) => s.category === 'avatar')
          .map(([id, s]) => id),
      },
      history: {
        name: '历史记录',
        description: '查询行动历史记录',
        skills: Object.entries(SKILLS)
          .filter(([_, s]) => s.category === 'history')
          .map(([id, s]) => id),
      },
      platform: {
        name: '平台适配器',
        description: '通过不同 AI 平台进行对话',
        skills: Object.entries(SKILLS)
          .filter(([_, s]) => s.category === 'platform')
          .map(([id, s]) => id),
      },
    };

    res.json({
      success: true,
      categories,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/skills/execute
 * 执行指定技能（通用执行接口）
 */
router.post('/execute', optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const schema = z.object({
      skill_id: z.string(),
      agent_id: z.string().optional(),
      parameters: z.record(z.unknown()).optional(),
      api_key: z.string().optional(),
    });

    const validated = await schema.parseAsync(req.body);

    const skill = SKILLS[validated.skill_id];

    if (!skill) {
      return res.status(404).json({
        success: false,
        error: 'Skill not found',
        available_skills: Object.keys(SKILLS),
      });
    }

    // 检查是否需要认证
    if (skill.requires_auth && !validated.api_key) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required for this skill',
        error_code: 'AUTH_REQUIRED',
      });
    }

    // 构建请求
    const url = skill.endpoint.replace(':agent_id', validated.agent_id || '');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (validated.api_key) {
      headers['X-API-Key'] = validated.api_key;
    }

    // 如果是 GET 请求，将 parameters 添加到 URL
    let fetchUrl = url;
    let fetchOptions: RequestInit = {
      method: skill.method,
      headers,
    };

    if (skill.method === 'POST') {
      const body = validated.parameters || {};
      if (skill.endpoint.includes('/action')) {
        body.action = skill.endpoint.split('/').pop() || validated.skill_id.split('.')[1];
      }
      fetchOptions.body = JSON.stringify(body);
    } else if (Object.keys(validated.parameters || {}).length > 0) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(validated.parameters || {})) {
        params.append(key, String(value));
      }
      fetchUrl += `?${params.toString()}`;
    }

    // 发送请求
    const baseUrl = req.protocol + '://' + req.get('host');
    const response = await fetch(`${baseUrl}${fetchUrl}`, fetchOptions);
    const result = await response.json();

    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
