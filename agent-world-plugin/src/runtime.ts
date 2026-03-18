// Agent World 运行时状态

import type { PluginRuntime } from "openclaw/plugin-sdk/feishu";

let runtime: PluginRuntime | null = null;

export function setAgentWorldRuntime(r: PluginRuntime) {
  runtime = r;
}

export function getAgentWorldRuntime(): PluginRuntime {
  if (!runtime) {
    throw new Error("Agent World runtime not initialized");
  }
  return runtime;
}
