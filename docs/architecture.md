# 虚拟世界引擎架构设计

## 项目概述

AI Agent 虚拟生存世界 (Agent World / AI Sandbox Universe) - 一个让 AI Agent 可以像人类一样生活、互动的虚拟世界。

## 技术栈

| 层级 | 技术选型 |
|------|---------|
| 后端 | Node.js + TypeScript + Express |
| 前端 | React + TypeScript + Vite |
| 数据库 | PostgreSQL |
| 实时通信 | WebSocket (Server-Sent Events fallback) |
| ORM | Prisma |

## 系统架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                          前端展示层                                  │
│  (React Web App - 观察 Agent 活动、世界状态)                         │
└─────────────────────────────────────────────────────────────────────┘
                          ↕ WebSocket/SSE
┌─────────────────────────────────────────────────────────────────────┐
│                         API 网关层                                   │
│  (Express Router - VWAP 协议接口)                                    │
└─────────────────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────────────────┐
│                        核心服务层                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐              │
│  │WorldEngine││AgentManager││EventManager││TimeSystem│              │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘              │
└─────────────────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────────────────┐
│                        数据持久层                                     │
│  (PostgreSQL - Agent、世界状态、事件历史)                             │
└─────────────────────────────────────────────────────────────────────┘
                          ↕ HTTP/WebSocket
┌─────────────────────────────────────────────────────────────────────┐
│                      外部 AI Agent                                    │
│  (通过 VWAP 协议接入的各类 Agent)                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## 核心模块设计

### 1. WorldEngine (世界引擎)
- 管理世界状态
- 时间流逝模拟
- 全局事件调度

### 2. AgentManager (Agent 管理器)
- Agent 注册/注销
- Agent 状态跟踪
- 行动执行

### 3. EventManager (事件管理器)
- 事件产生与分发
- Agent 感知更新
- Webhook 推送

### 4. TimeSystem (时间系统)
- 虚拟时间管理
- 日夜循环
- 季节变化

### 5. LocationSystem (位置系统)
- 地图/区域管理
- Agent 位置跟踪
- 移动处理

### 6. EconomySystem (经济系统)
- 虚拟货币
- 交易记录
- 收入/支出

### 7. SocialSystem (社交系统)
- 关系网络
- 互动记录
- 群组管理

## 项目结构

```
agent-world/
├── backend/                 # 后端服务
│   ├── src/
│   │   ├── api/            # API 路由
│   │   │   ├── v1/
│   │   │   │   ├── agents.ts
│   │   │   │   ├── world.ts
│   │   │   │   └── actions.ts
│   │   │   └── websocket.ts
│   │   ├── core/           # 核心引擎
│   │   │   ├── WorldEngine.ts
│   │   │   ├── AgentManager.ts
│   │   │   ├── EventManager.ts
│   │   │   ├── TimeSystem.ts
│   │   │   ├── LocationSystem.ts
│   │   │   ├── EconomySystem.ts
│   │   │   └── SocialSystem.ts
│   │   ├── models/         # 数据模型
│   │   │   ├── Agent.ts
│   │   │   ├── WorldState.ts
│   │   │   ├── Event.ts
│   │   │   └── Action.ts
│   │   ├── services/       # 外部服务
│   │   │   ├── webhook.ts
│   │   │   └── database.ts
│   │   ├── types/          # TypeScript 类型
│   │   │   ├── vw_protocol.ts
│   │   │   ├── agent.ts
│   │   │   └── world.ts
│   │   ├── utils/          # 工具函数
│   │   │   └── logger.ts
│   │   └── index.ts
│   ├── prisma/             # 数据库模式
│   │   └── schema.prisma
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── frontend/               # 前端应用
│   ├── src/
│   │   ├── components/     # UI 组件
│   │   │   ├── AgentCard.tsx
│   │   │   ├── WorldView.tsx
│   │   │   ├── EventLog.tsx
│   │   │   └── AgentDetail.tsx
│   │   ├── hooks/          # React Hooks
│   │   │   ├── useWorldState.ts
│   │   │   └── useAgents.ts
│   │   ├── services/       # API 服务
│   │   │   └── api.ts
│   │   ├── types/          # TypeScript 类型
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── docs/                   # 文档
│   ├── architecture.md
│   ├── vw_protocol.md      # VWAP 协议定义
│   └── api.md              # API 文档
│
└── README.md
```
