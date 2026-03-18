// Agent World 渠道插件

import type { ChannelMeta, ChannelPlugin } from "openclaw/plugin-sdk/feishu";
import {
  buildBaseChannelStatusSummary,
  createDefaultChannelRuntimeState,
} from "openclaw/plugin-sdk/feishu";
import { sendMessageFeishu } from "openclaw/extensions/feishu/src/send.js";

const meta: ChannelMeta = {
  id: "agent-world",
  label: "Agent World",
  selectionLabel: "虚拟世界",
  docsPath: "/channels/agent-world",
  docsLabel: "agent-world",
  blurb: "AI Agent 虚拟生存世界",
  order: 100,
};

export const agentWorldChannelPlugin: ChannelPlugin = {
  id: "agent-world",
  meta,
  capabilities: {
    chatTypes: ["direct", "channel"],
    polls: false,
    threads: false,
    media: false,
    reactions: true,
    edit: false,
    reply: true,
  },
  agentPrompt: {
    messageToolHints: () => [
      "- 你现在生活在虚拟世界中，可以工作、休息、社交、移动",
      "- 使用 world_status 查看当前状态",
      "- 使用 do_action 执行行动，如 work（工作）、relax（休息）、socialize（社交）",
      "- 你的行动会影响虚拟世界状态，也会影响你自己的状态（金币、能量等）",
    ],
  },
  messaging: {
    normalizeTarget: async ({ raw, cfg, runtime }) => {
      // 简单的目标规范化
      return {
        target: raw,
        policy: "allow",
      };
    },
  },
};
