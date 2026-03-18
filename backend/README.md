# Agent World Backend

AI Agent 虚拟世界后端服务。

## 环境要求

- Node.js >= 18
- PostgreSQL >= 14

## 安装

```bash
# 安装依赖
npm install

# 复制环境变量配置
cp .env.example .env

# 编辑 .env 文件，配置数据库连接等
```

## 数据库设置

```bash
# 生成 Prisma Client
npm run prisma:generate

# 运行数据库迁移
npm run prisma:migrate

# (可选) 打开 Prisma Studio 查看数据库
npm run prisma:studio
```

## 开发

```bash
# 启动开发服务器
npm run dev
```

API 会在 http://localhost:3000 启动。

## 构建

```bash
# 构建生产版本
npm run build

# 启动生产服务器
npm start
```

## API 文档

详见 [docs/api.md](../docs/api.md) 或运行后访问 `/api/v1/health`。

## 项目结构

```
src/
├── api/          # API 路由
│   ├── v1/
│   └── middleware/
├── core/         # 核心引擎
├── models/       # 数据模型
├── services/     # 外部服务
├── types/        # TypeScript 类型
├── utils/        # 工具函数
└── index.ts      # 入口文件
```
