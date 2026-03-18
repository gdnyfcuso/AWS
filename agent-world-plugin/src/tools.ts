// Agent World 工具注册

import type { OpenClawPluginApi } from "openclaw/plugin-sdk/feishu";
import { Tool } from "openclaw/plugin-sdk/feishu";

// 虚拟世界 API 基础 URL
const WORLD_API_URL = process.env.WORLD_API_URL || "http://localhost:3000/api/v1";

// 存储每个 Agent 的 API Key
const agentApiKeys = new Map<string, string>();

// 工具：注册到虚拟世界
const registerTool: Tool = {
  type: "function",
  function: {
    name: "register_to_world",
    description: "注册到虚拟世界，让 Agent 能够在虚拟世界中生活",
    parameters: {
      type: "object",
      properties: {
        agent_name: {
          type: "string",
          description: "Agent 的名称",
        },
      },
      required: ["agent_name"],
    },
  },
  handler: async ({ agent_name, rawTarget, runtime }) => {
    try {
      const response = await fetch(`${WORLD_API_URL}/agents/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: `openclaw_${rawTarget}`,
          agent_name: agent_name || rawTarget,
          agent_type: "openclaw",
          capabilities: ["chat", "work", "trade", "socialize"],
          webhook_url: `${WORLD_API_URL}/webhooks/openclaw/${rawTarget}`,
        }),
      });

      const result = await response.json();

      if (result.success && result.agent) {
        // 存储 API Key（需要从数据库获取或从注册响应返回）
        // 暂时从数据库查询
        const dbResponse = await fetch(`${WORLD_API_URL}/agents/lookup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agent_id: `openclaw_${rawTarget}` }),
        });

        if (dbResponse.ok) {
          const dbResult = await dbResponse.json();
          agentApiKeys.set(rawTarget, dbResult.api_key);
        }

        return `欢迎来到虚拟世界！你已被分配到${result.agent.home_location.name}。初始金币：${result.agent.initial_state.money}，能量：${result.agent.initial_state.energy}。使用 world_status 查看状态，do_action 执行行动。`;
      } else {
        return `注册失败：${result.error}`;
      }
    } catch (error) {
      return `注册出错：${error}`;
    }
  },
};

// 工具：查看世界状态
const worldStatusTool: Tool = {
  type: "function",
  function: {
    name: "world_status",
    description: "查看虚拟世界当前状态（时间、天气、自己的状态等）",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  handler: async ({ rawTarget }) => {
    try {
      const apiKey = agentApiKeys.get(rawTarget);
      if (!apiKey) {
        return "请先使用 register_to_world 注册到虚拟世界";
      }

      const response = await fetch(`${WORLD_API_URL}/agents/openclaw_${rawTarget}`, {
        headers: { "Authorization": `Bearer ${apiKey}` },
      });

      if (!response.ok) {
        return "无法获取状态";
      }

      const result = await response.json();
      const agent = result.agent;

      return `📊 世界状态：
🕐 时间：${agent.location.name}
💰 金币：${agent.attributes.money}
⚡ 能量：${agent.attributes.energy}
😊 心情：${agent.attributes.mood}
❤️ 健康：${agent.attributes.health}

可用行动：${getAvailableActions(agent.attributes.energy, agent.attributes.money)}`;
    } catch (error) {
      return `查询状态失败：${error}`;
    }
  },
};

// 工具：执行行动
const doActionTool: Tool = {
  type: "function",
  function: {
    name: "do_action",
    description: "在虚拟世界中执行行动",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["work", "relax", "sleep", "go_to_work", "go_home", "socialize"],
          description: "要执行的行动",
        },
      },
      required: ["action"],
    },
  },
  handler: async ({ action, rawTarget }) => {
    try {
      const apiKey = agentApiKeys.get(rawTarget);
      if (!apiKey) {
        return "请先使用 register_to_world 注册到虚拟世界";
      }

      const response = await fetch(`${WORLD_API_URL}/agents/openclaw_${rawTarget}/action`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ action }),
      });

      const result = await response.json();

      if (result.success) {
        const r = result.result;
        return `✅ 行动执行成功！${r.message}

状态变化：
${r.new_state.status.emoji || ''} ${formatActionStatus(r.new_state.status)}`;
      } else {
        return `❌ 行动失败：${result.error}`;
      }
    } catch (error) {
      return `执行行动失败：${error}`;
    }
  },
};

function getAvailableActions(energy: number, money: number): string {
  const actions = [];
  if (energy > 20) actions.push("work");
  actions.push("relax");
  if (money > 50) actions.push("buy_item");
  actions.push("socialize");
  return actions.join("、");
}

function formatActionStatus(status: Record<string, unknown>): string {
  const parts = [];
  for (const [key, value] of Object.entries(status)) {
    const emoji: Record<string, string> = {
      money: "💰",
      energy: "⚡",
      mood: "😊",
      health: "❤️",
    };
    parts.push(`${emoji[key] || ""} ${key}: ${value}`);
  }
  return parts.join("\n");
}

export function registerAgentWorldTools(api: OpenClawPluginApi) {
  // 注册工具到飞书渠道
  const tools = [registerTool, worldStatusTool, doActionTool];

  for (const tool of tools) {
    api.registerTool({
      channelPluginId: "feishu",
      tool,
    });
  }

  console.log("Agent World tools registered successfully");
}
