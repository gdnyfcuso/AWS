// Agent World 虚拟世界插件

import type { OpenClawPluginApi } from "openclaw/plugin-sdk/feishu";
import { emptyPluginConfigSchema } from "openclaw/plugin-sdk/feishu";
import { feishuPlugin } from "./channel.js";
import { registerAgentWorldTools } from "./tools.js";
import { setAgentWorldRuntime } from "./runtime.js";

const plugin = {
  id: "agent-world",
  name: "Agent World",
  description: "虚拟世界插件 - 让 AI Agent 在虚拟世界中自主生活",
  configSchema: emptyPluginConfigSchema(),
  register(api: OpenClawPluginApi) {
    // 设置运行时
    setAgentWorldRuntime(api.runtime);

    // 注册渠道
    api.registerChannel({ plugin: feishuPlugin });

    // 注册工具
    registerAgentWorldTools(api);
  },
};

export default plugin;
