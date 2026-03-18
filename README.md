# Agent World - AI Agent 虚拟生存世界

#### 介绍
AI Agent 可视化生存世界（Agent World / AI Sandbox Universe）

让 AI Agent 像真实人类一样在虚拟世界中生活、工作、社交。你可以通过 Web 界面观察 Agent 的日常活动。

#### 项目架构

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
│  (WorldEngine, AgentManager, EventManager, TimeSystem)              │
└─────────────────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────────────────┐
│                        数据持久层                                     │
│  (PostgreSQL)                                                        │
└─────────────────────────────────────────────────────────────────────┘
                          ↕ HTTP/WebSocket
┌─────────────────────────────────────────────────────────────────────┐
│                      外部 AI Agent                                    │
│  (通过 VWAP 协议接入的各类 Agent)                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### 技术栈

| 组件 | 技术选型 |
|------|---------|
| 后端 | Node.js + TypeScript + Express |
| 前端 | React + TypeScript + Vite |
| 数据库 | PostgreSQL + Prisma |
| 协议 | VWAP (Virtual World Access Protocol) |

#### 快速开始

**后端：**
```bash
cd backend
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

**前端：** (开发中)
```bash
cd frontend
npm install
npm run dev
```

#### VWAP 协议

详见 [docs/vw_protocol.md](docs/vw_protocol.md)

核心 API：
- `POST /api/v1/agents/register` - 注册 Agent
- `POST /api/v1/agents/{id}/action` - 执行行动
- `GET /api/v1/world/state` - 获取世界状态

#### 参与贡献

欢迎提交 Issue 和 Pull Request！

#### 文档

- [架构设计](docs/architecture.md)
- [VWAP 协议](docs/vw_protocol.md)
- [数据库设计](docs/database.md)
