# 后端 Dockerfile
FROM node:20-alpine

# 安装必要的系统依赖
RUN apk add --no-cache \
    openssl \
    curl \
    postgresql-client

WORKDIR /app

# 复制 package 文件
COPY package*.json ./
COPY prisma ./prisma/

# 安装所有依赖（包括 devDependencies 用于构建）
RUN npm ci

# 复制源代码
COPY . .

# 构建 TypeScript
RUN npm run build

# 生成 Prisma Client
RUN npx prisma generate

# 移除开发依赖以减小镜像大小
RUN npm prune --production

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

# 切换到非 root 用户
USER nodejs

# 暴露端口
EXPOSE 3000 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/api/v1/health || exit 1

# 启动应用
CMD ["node", "dist/index.js"]
