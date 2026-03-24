# AI Virtual World - 部署指南

本文档提供 AI Virtual World 项目的部署说明。

## 目录

- [环境要求](#环境要求)
- [快速开始](#快速开始)
- [测试环境部署](#测试环境部署)
- [生产环境部署](#生产环境部署)
- [SSL 证书配置](#ssl-证书配置)
- [常见问题](#常见问题)
- [维护操作](#维护操作)

---

## 环境要求

### 软件要求

- Docker 20.10+
- Docker Compose 2.0+
- Git

### 硬件要求

| 环境 | CPU | 内存 | 磁盘 |
|------|-----|------|------|
| 测试环境 | 2 核 | 2 GB | 10 GB |
| 生产环境 | 4 核 | 4 GB | 20 GB |

### 网络要求

- 测试环境: 可访问的 IP 地址
- 生产环境: 已配置的域名 (www.aivworld.com, api.aivworld.com)
- 开放端口: 80, 443, 3000, 3001, 5432

---

## 快速开始

### 1. 克隆仓库

```bash
git clone <repository-url>
cd aws
```

### 2. 配置环境变量

**测试环境:**
```bash
# 直接使用 docker-compose.yml 中的默认配置
export TEST_IP=100.64.0.131
```

**生产环境:**
```bash
cp .env.production .env.production.local
# 编辑 .env.production.local，修改敏感信息
vi .env.production.local
```

### 3. 部署

**测试环境:**
```bash
bash scripts/deploy-test.sh
```

**生产环境:**
```bash
bash scripts/deploy-prod.sh
```

---

## 测试环境部署

测试环境使用 IP 地址访问，适合开发和小规模测试。

### 配置说明

- 前端地址: `http://<TEST_IP>:80`
- 后端地址: `http://<TEST_IP>:3000`
- API 地址: `http://<TEST_IP>:3000/api/v1`

### 部署步骤

1. **设置测试 IP (可选)**
   ```bash
   export TEST_IP=100.64.0.131  # 你的测试服务器 IP
   ```

2. **部署**
   ```bash
   bash scripts/deploy-test.sh
   ```

3. **验证部署**
   ```bash
   # 检查服务状态
   docker-compose ps

   # 查看日志
   docker-compose logs -f

   # 测试 API
   curl http://<TEST_IP>:3000/api/v1/health
   ```

### 停止服务

```bash
docker-compose down
```

---

## 生产环境部署

生产环境使用域名和 HTTPS，需要配置 SSL 证书。

### 配置说明

- 前端地址: `https://www.aivworld.com`
- 后端地址: `https://api.aivworld.com`

### 前置条件

1. **域名配置**
   - 将 `www.aivworld.com` 和 `api.aivworld.com` 解析到服务器 IP
   - 确保 DNS 已生效

2. **防火墙配置**
   ```bash
   # 开放必要端口
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw allow 3000/tcp  # 可选，如果需要直接访问后端
   sudo ufw allow 3001/tcp  # 可选，WebSocket
   ```

### 部署步骤

1. **配置环境变量**
   ```bash
   cp .env.production .env.production.local
   vi .env.production.local
   ```

   修改以下敏感配置:
   ```env
   POSTGRES_PASSWORD=<强密码>
   API_SECRET_KEY=<强密钥>
   CERT_EMAIL=<你的邮箱>
   ```

2. **获取 SSL 证书**
   ```bash
   bash scripts/setup-ssl.sh
   ```

3. **部署**
   ```bash
   bash scripts/deploy-prod.sh
   ```

4. **验证部署**
   ```bash
   # 检查服务状态
   docker-compose -f docker-compose.prod.yml ps

   # 查看 HTTPS 是否正常
   curl -I https://www.aivworld.com
   curl -I https://api.aivworld.com/api/v1/health
   ```

---

## SSL 证书配置

生产环境使用 Let's Encrypt 免费证书。

### 自动获取证书

```bash
bash scripts/setup-ssl.sh
```

### 手动获取证书

如果自动脚本失败，可以手动获取:

```bash
# 安装 Certbot
sudo apt-get install certbot

# 获取证书
sudo certbot certonly --standalone -d www.aivworld.com -d aivworld.com
sudo certbot certonly --standalone -d api.aivworld.com

# 复制证书
sudo cp /etc/letsencrypt/live/www.aivworld.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/www.aivworld.com/privkey.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/www.aivworld.com/chain.pem nginx/ssl/
```

### 证书续期

Certbot 会自动设置续期任务。可以手动测试续期:

```bash
sudo certbot renew --dry-run
```

---

## 常见问题

### 1. 端口被占用

```bash
# 查看占用端口的进程
sudo lsof -i :80
sudo lsof -i :443

# 停止冲突的服务
sudo systemctl stop nginx  # 如果系统安装了 nginx
```

### 2. Docker 权限问题

```bash
# 将用户添加到 docker 组
sudo usermod -aG docker $USER

# 重新登录或执行
newgrp docker
```

### 3. 数据库连接失败

```bash
# 检查数据库容器状态
docker-compose ps

# 查看数据库日志
docker-compose logs postgres

# 进入数据库容器
docker-compose exec postgres psql -U agentworld -d agent_world
```

### 4. SSL 证书验证失败

- 确保域名已正确解析
- 确保 80 和 443 端口开放
- 检查防火墙设置

### 5. 前端无法连接后端

- 检查 CORS 配置
- 确认后端服务正常启动
- 检查网络连接

---

## 维护操作

### 查看日志

```bash
# 所有服务
docker-compose logs -f

# 特定服务
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### 重启服务

```bash
# 重启所有服务
docker-compose restart

# 重启特定服务
docker-compose restart backend
```

### 更新代码

```bash
# 拉取最新代码
git pull

# 重新构建和部署
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### 数据库操作

```bash
# 运行迁移
docker-compose exec backend npx prisma migrate deploy

# 进入数据库
docker-compose exec postgres psql -U agentworld -d agent_world

# 备份数据库
docker-compose exec postgres pg_dump -U agentworld agent_world > backup.sql

# 恢复数据库
docker-compose exec -T postgres psql -U agentworld agent_world < backup.sql
```

### 监控资源使用

```bash
# 容器资源使用
docker stats

# 磁盘使用
docker system df

# 清理未使用的资源
docker system prune -a
```

---

## 架构说明

### 服务架构

```
┌─────────────────┐
│   Nginx Proxy   │ (端口 80/443)
│   (生产环境)     │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼────────┐
│ 前端   │ │ 后端 API  │
│ :80   │ │ :3000     │
└───────┘ └───┬───────┘
              │
         ┌────▼────┐
         │PostgreSQL│
         │  :5432  │
         └─────────┘
```

### 网络架构

所有服务运行在 `aivworld-network` Docker 网络中，可以通过服务名互相访问。

- 前端通过 `http://backend:3000` 访问后端
- 后端通过 `postgres://postgres:5432` 访问数据库

---

## 安全建议

1. **修改默认密码**: 生产环境必须修改 `.env.production` 中的密码
2. **定期更新**: 保持 Docker 镜像和系统更新
3. **备份策略**: 定期备份数据库
4. **监控告警**: 设置服务监控和告警
5. **访问限制**: 限制数据库直接访问

---

## 联系支持

如有问题，请联系技术支持或查看项目文档。
